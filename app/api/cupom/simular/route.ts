import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { condicoesDoPlano } from "@/lib/cupom";
import { UserError } from "@/lib/errors";
import { clientIp, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Mostra o preço e o período grátis de um plano, com ou sem cupom (não grava nada). */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (await limited(`cupom-sim:${u.id}`, 30, 10 * 60_000) || await limited(`cupom-sim-ip:${clientIp(req)}`, 60, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  try {
    const r = await condicoesDoPlano(u, String(b.plano || ""), String(b.cupom || ""));
    return NextResponse.json({ ok: true, preco: r.preco, precoFinal: r.precoFinal, teste: r.teste ? { dias: r.teste.dias, creditos: r.teste.creditos } : null });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("cupom-simular:", (e as Error)?.message);
    return NextResponse.json({ error: "Não foi possível conferir o cupom agora. Tente de novo." }, { status: 500 });
  }
}
