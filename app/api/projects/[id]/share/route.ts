import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { rulesOf } from "@/lib/plans";
import { limited } from "@/lib/ratelimit";
import { store } from "@/lib/store";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Estado do link de apresentação do projeto: o token ativo (se houver) e o que o plano permite. */
async function estado(userId: string, projectId: string, limite: number) {
  const ativos = await store.listShares(userId);
  const atual = ativos.find((s) => s.projectId === projectId) ?? null;
  const usados = ativos.length;
  const permitido = limite > 0 && (!!atual || usados < limite);
  const motivo = limite <= 0 ? "Os links de apresentação fazem parte dos planos Profissional e Max."
    : !permitido ? `Seu plano permite ${limite} link${limite > 1 ? "s" : ""} ativo${limite > 1 ? "s" : ""} e você já usa ${usados}. Desative outro link para criar este.` : "";
  return { token: atual?.token ?? null, permitido, motivo, limite: Number.isFinite(limite) ? limite : null, usados };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const { id } = await params;
  if (!(await store.getProject(id, u.id))) return bad("Projeto não encontrado.", 404);
  return NextResponse.json(await estado(u.id, id, rulesOf(u).linksApresentacao));
}

/** Cria o link (ou devolve o que já existe). O token é aleatório e não dá para adivinhar. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  if (await limited(`share:${u.id}`, 30, 10 * 60_000)) return bad("Muitas alterações em pouco tempo. Aguarde um pouco.", 429);
  const { id } = await params;
  if (!(await store.getProject(id, u.id))) return bad("Projeto não encontrado.", 404);
  const limite = rulesOf(u).linksApresentacao;
  const antes = await estado(u.id, id, limite);
  if (antes.token) return NextResponse.json(antes);
  if (!antes.permitido) return bad(antes.motivo, 403);
  try {
    await store.createShare(u.id, id, randomBytes(24).toString("base64url"));
  } catch (e: any) {
    console.error("createShare:", e?.message);
    return bad("Não foi possível criar o link agora. Tente de novo em instantes.", 500);
  }
  return NextResponse.json(await estado(u.id, id, limite));
}

/** Desativa o link do projeto: a partir daí, o endereço deixa de funcionar. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const { id } = await params;
  const atual = (await store.listShares(u.id)).find((s) => s.projectId === id);
  if (atual) await store.revokeShare(u.id, atual.token);
  return NextResponse.json(await estado(u.id, id, rulesOf(u).linksApresentacao));
}
