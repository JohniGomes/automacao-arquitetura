import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const gen = db().generations.find((x) => x.id === id && x.userId === u.id);
  if (!gen) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ generation: gen, credits: u.credits });
}
