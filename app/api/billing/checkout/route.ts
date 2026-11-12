import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { billingEnabled, createCheckout, Method, scrub } from "@/lib/billing";
import { UserError } from "@/lib/errors";
import { clientIp, limited } from "@/lib/ratelimit";
import { needsVerification, VERIFY_MSG } from "@/lib/verify";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Cria a cobrança no Asaas (Pix ou cartão) e devolve o que a tela mostra. Os dados do cartão só passam por aqui a caminho
 * do Asaas: não são gravados, nem entram em log, nem em URL. Os créditos só entram depois, pelo webhook.
 */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: NO_STORE });
  if (needsVerification(u)) return NextResponse.json({ error: VERIFY_MSG }, { status: 403, headers: NO_STORE });
  if (!billingEnabled()) return NextResponse.json({ error: "A cobrança ainda não está ativa. Fale com o suporte para contratar." }, { status: 501, headers: NO_STORE });
  const b = await req.json().catch(() => ({}));
  const method = String(b.method || "") as Method;
  const ip = clientIp(req);
  // tentativas de cartão são limitadas: impede quem testa números de cartão em série
  const card = method === "CREDIT_CARD";
  if (limited(`checkout-${card ? "card" : "pix"}:${u.id}`, card ? 8 : 15, 10 * 60_000) || (card && limited(`checkout-card-ip:${ip}`, 16, 10 * 60_000)))
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." }, { status: 429, headers: NO_STORE });
  try {
    const c = b.card || {};
    const cardInput = card ? {
      holderName: String(c.holderName || ""), number: String(c.number || ""), expiryMonth: String(c.expiryMonth || ""), expiryYear: String(c.expiryYear || ""),
      ccv: String(c.ccv || ""), postalCode: String(c.postalCode || ""), addressNumber: String(c.addressNumber || ""), phone: String(c.phone || ""),
    } : undefined;
    const out = await createCheckout(u, String(b.id || ""), method, String(b.cpfCnpj || ""), cardInput, ip);
    return NextResponse.json(out, { headers: NO_STORE });
  } catch (e: any) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400, headers: NO_STORE });
    console.error("checkout:", scrub(String(e?.message || "")));
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." }, { status: 502, headers: NO_STORE });
  }
}
