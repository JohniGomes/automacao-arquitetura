import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/billing";
import { activePlan } from "@/lib/plans";

/** Cancela a renovação. O plano continua valendo até o fim do período já pago. */
export async function POST() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!activePlan(u)) return NextResponse.json({ error: "Você não tem um plano ativo." }, { status: 400 });
  try {
    await cancelSubscription(u);
  } catch (e: any) {
    console.error("cancelamento:", e?.message);
    return NextResponse.json({ error: "Não foi possível cancelar agora. Tente novamente ou fale com o suporte." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
