import { pub } from "@/lib/public";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { cancelJob, live } from "@/lib/jobs";
import { store } from "@/lib/store";

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const mem = live.get(id);
  const gen = mem && mem.userId === u.id ? mem : await store.getGen(id, u.id);
  if (!gen) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ generation: pub(gen), credits: (await store.getUser(u.id))?.credits ?? u.credits });
}

/** Cancela a geração (na fila, ou o filme entre as cenas). */
export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const r = await cancelJob(u.id, (await params).id);
  if (r === "nao-encontrada") return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (r === "nao-cancelavel") return NextResponse.json({ error: "Esta geração já está sendo feita e não pode ser cancelada." }, { status: 409 });
  return NextResponse.json({ ok: true, status: r });
}
