import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { live } from "@/lib/jobs";
import { store } from "@/lib/store";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Favoritar e/ou mover uma geração para um projeto (projectId null = sem projeto). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const meta: { favorite?: boolean; projectId?: string | null } = {};
  if (typeof b.favorite === "boolean") meta.favorite = b.favorite;
  if ("projectId" in b) {
    if (b.projectId === null) meta.projectId = null;
    else if (typeof b.projectId === "string" && (await store.getProject(b.projectId, u.id))) meta.projectId = b.projectId;
    else return bad("Projeto não encontrado.", 404);
  }
  try {
    const g = await store.setGenMeta(id, u.id, meta);
    if (!g) return bad("Geração não encontrada.", 404);
    const mem = live.get(id);
    if (mem && mem.userId === u.id) Object.assign(mem, meta); // geração em andamento neste processo
    return NextResponse.json({ generation: g });
  } catch (e: any) {
    return bad(e.message || "Não foi possível atualizar.", 500);
  }
}
