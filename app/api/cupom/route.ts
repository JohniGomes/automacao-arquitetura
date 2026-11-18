import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { resgatarCupom } from "@/lib/cupom";
import { UserError } from "@/lib/errors";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Resgata um cupom de desconto (plano + créditos por alguns dias). */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (await limited(`cupom:${u.id}`, 8, 10 * 60_000) || await limited(`cupom-ip:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  try {
    const r = await resgatarCupom(u, String(b.cupom || ""));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("cupom:", (e as Error)?.message);
    return NextResponse.json({ error: "Não foi possível usar o cupom agora. Tente de novo." }, { status: 500 });
  }
}
