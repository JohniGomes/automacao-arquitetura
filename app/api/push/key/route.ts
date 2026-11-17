import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { chavePublica, pushAtivo } from "@/lib/push";

export const runtime = "nodejs";

/** Chave pública VAPID, para o navegador criar a inscrição. `ativo: false` quando o servidor não tem as chaves. */
export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ ativo: pushAtivo(), chave: pushAtivo() ? chavePublica() : "" });
}
