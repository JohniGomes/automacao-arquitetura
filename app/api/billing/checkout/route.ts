import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

/**
 * INTEGRAÇÃO A PREPARAR — não cobra de verdade.
 * Fluxo previsto: criar sessão de checkout (Stripe Checkout / Mercado Pago Preference / Pix) com o pacote escolhido,
 * e um webhook assinado (/api/billing/webhook) que chama `grant(userId, credits)` ao confirmar o pagamento.
 */
export async function POST() {
  if (!(await currentUser())) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ error: "Cobrança ainda não integrada (Stripe / Mercado Pago / Pix a preparar)." }, { status: 501 });
}
