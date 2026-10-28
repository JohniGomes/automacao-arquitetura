import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { live } from "@/lib/jobs";
import { store } from "@/lib/store";

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const mem = live.get(id);
  const gen = mem && mem.userId === u.id ? mem : await store.getGen(id, u.id);
  if (!gen) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ generation: gen, credits: (await store.getUser(u.id))?.credits ?? u.credits });
}
