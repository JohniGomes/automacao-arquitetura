import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().slice(0, 80);
  if (!name) return bad("Dê um nome ao projeto.");
  const p = await store.renameProject(id, u.id, name);
  if (!p) return bad("Projeto não encontrado.", 404);
  return NextResponse.json({ project: p });
}

/** Apaga o projeto. As gerações dele continuam na conta, sem projeto. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const { id } = await params;
  if (!(await store.getProject(id, u.id))) return bad("Projeto não encontrado.", 404);
  await store.deleteProject(id, u.id);
  return NextResponse.json({ ok: true });
}
