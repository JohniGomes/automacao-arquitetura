import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { resgatarCodigo } from "@/lib/promo";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Resgata o código do VDO Club (plano Max por alguns dias + créditos). */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (await limited(`promo:${u.id}`, 8, 10 * 60_000) || await limited(`promo-ip:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  try {
    const r = await resgatarCodigo(u, String(b.codigo || "").slice(0, 80));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("promo:", (e as Error)?.message);
    return NextResponse.json({ error: "Não foi possível usar o código agora. Tente de novo." }, { status: 500 });
  }
}
