import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { billingEnabled, createCheckout } from "@/lib/billing";
import { UserError } from "@/lib/errors";
import { limited } from "@/lib/ratelimit";

/** Cria a cobrança no Asaas e devolve o link de pagamento. Os créditos só entram depois, pelo webhook. */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!billingEnabled()) return NextResponse.json({ error: "A cobrança ainda não está ativa. Fale com o suporte para contratar." }, { status: 501 });
  if (limited(`checkout:${u.id}`, 10, 60 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  try {
    const url = await createCheckout(u, String(b.id || ""), String(b.cpfCnpj || ""));
    if (!url) throw new Error("sem link de pagamento");
    return NextResponse.json({ url });
  } catch (e: any) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("checkout:", e?.message);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." }, { status: 502 });
  }
}
