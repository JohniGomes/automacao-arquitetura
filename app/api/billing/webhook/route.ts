import { NextRequest, NextResponse } from "next/server";
import { handleEvent, verifyWebhookToken } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Notificações do Asaas. O token (cabeçalho asaas-access-token) é conferido e o pagamento é consultado de novo na API
 * do Asaas antes de qualquer crédito: o corpo recebido só diz "olhe o pagamento X". A entrega é "ao menos uma vez";
 * o registro de pagamentos garante que o mesmo pagamento não conceda créditos duas vezes.
 */
export async function POST(req: NextRequest) {
  if (!verifyWebhookToken(req.headers)) return new NextResponse("token inválido", { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });
  try {
    await handleEvent(body);
  } catch (e: any) {
    // 500 faz o Asaas tentar de novo (depois de 15 falhas seguidas ele pausa a fila de envio: confira o painel)
    console.error("webhook de cobrança falhou:", e?.message);
    return new NextResponse("erro", { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
