import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { cupomParaPlano } from "@/lib/cupom";
import { UserError } from "@/lib/errors";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Mostra o preço do primeiro mês de um plano com o cupom de desconto (não grava nada). */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (await limited(`cupom-sim:${u.id}`, 30, 10 * 60_000) || await limited(`cupom-sim-ip:${clientIp(req)}`, 60, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  try {
    const r = await cupomParaPlano(u, String(b.cupom || ""), String(b.plano || ""));
    return NextResponse.json({ ok: true, preco: r.preco, precoFinal: r.precoFinal });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("cupom-simular:", (e as Error)?.message);
    return NextResponse.json({ error: "Não foi possível conferir o cupom agora. Tente de novo." }, { status: 500 });
  }
}
