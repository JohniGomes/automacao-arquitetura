import { NextResponse } from "next/server";
import { NOVIDADES, VERSAO_ATUAL } from "@/lib/novidades";

export const dynamic = "force-dynamic";

/** Versão em produção e o que mudou. O app aberto consulta aqui para avisar "Nova atualização". Sem dados de usuário. */
export async function GET() {
  return NextResponse.json({ versao: VERSAO_ATUAL, novidade: NOVIDADES[0] }, { headers: { "Cache-Control": "no-store" } });
}
