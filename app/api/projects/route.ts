import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { rulesOf } from "@/lib/plans";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const cleanName = (v: unknown) => String(v ?? "").trim().slice(0, 80);

/** Lista os projetos do usuário com quantidade de gerações e uma capa (última imagem pronta). */
export async function GET() {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const [projects, gens] = await Promise.all([store.listProjects(u.id), store.listGens(u.id)]);
  const out = projects.map((p) => {
    const mine = gens.filter((g) => g.projectId === p.id);
    const cover = mine.flatMap((g) => (g.status === "done" ? g.outputs : [])).find((o) => o.kind === "image")?.file ?? null;
    return { ...p, count: mine.length, cover };
  });
  return NextResponse.json({ projects: out });
}

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const b = await req.json().catch(() => ({}));
  const name = cleanName(b.name);
  if (!name) return bad("Dê um nome ao projeto.");
  const maxProjects = rulesOf(u).projetos;
  if (Number.isFinite(maxProjects) && (await store.listProjects(u.id)).length >= maxProjects) return bad(`Seu plano permite até ${maxProjects} projetos. Os planos Profissional e Max não têm limite.`, 403);
  try {
    const project = await store.createProject(u.id, name);
    return NextResponse.json({ project: { ...project, count: 0, cover: null } });
  } catch (e: any) {
    return bad(e.message || "Não foi possível criar o projeto.", 500);
  }
}
