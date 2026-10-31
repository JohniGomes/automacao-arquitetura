import { NextRequest, NextResponse } from "next/server";
import { handleNotification, verifySignature } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Notificações do Mercado Pago. A assinatura é conferida e o pagamento é consultado de novo na API do Mercado Pago
 * antes de qualquer crédito: o corpo recebido aqui só diz "olhe o pagamento X".
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type = String(req.nextUrl.searchParams.get("type") || req.nextUrl.searchParams.get("topic") || body.type || body.topic || "");
  const dataId = String(req.nextUrl.searchParams.get("data.id") || req.nextUrl.searchParams.get("id") || body?.data?.id || "");
  if (!verifySignature(req.headers, dataId)) return new NextResponse("assinatura inválida", { status: 401 });
  try {
    await handleNotification(type, dataId);
  } catch (e: any) {
    // 500 faz o Mercado Pago tentar de novo mais tarde (o registro do pagamento garante que não concede em dobro)
    console.error("webhook de cobrança falhou:", e?.message);
    return new NextResponse("erro", { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
