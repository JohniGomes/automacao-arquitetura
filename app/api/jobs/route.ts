import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { charge, COSTS } from "@/lib/credits";
import { renderCost } from "@/lib/costs";
import { composeEsboco, composeIdeia, composeMelhorar, composeRender, ESTILOS, ESTILOS_ARQ, EstiloKey, Env, MELHORIAS, MelhoriaKey, TIPOS_IDEIA } from "@/lib/compose";
import { Generation, GenType, uid } from "@/lib/db";
import { enqueue, live, recoverStale } from "@/lib/jobs";
import { Img } from "@/lib/gemini";
import { mockGemini, mockMaps } from "@/lib/config";
import { store } from "@/lib/store";
import { AMBIENTES, AmbienteKey, CENAS, CenaKey, LUZES, LuzKey, PROMPT_RENDER } from "@/lib/prompts";

export const runtime = "nodejs";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const TEMPLATES = path.join(process.cwd(), "templates", "moodboards");

export async function GET() {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  await recoverStale();
  const list = (await store.listGens(u.id)).map((g) => live.get(g.id) ?? g);
  return NextResponse.json({ credits: u.credits, generations: list });
}

/** Lê imagem enviada (arquivo), referência a uma geração anterior ("ref:<arquivo>") ou modelo da galeria ("tpl:<arquivo>"). */
async function readImage(userId: string, form: FormData, key: string): Promise<Img | null> {
  const f = form.get(key);
  let buf: Buffer | null = null;
  if (f instanceof File && f.size > 0) {
    if (f.size > 15 * 1024 * 1024) throw new Error("Imagem acima de 15 MB.");
    buf = Buffer.from(await f.arrayBuffer());
  } else if (typeof f === "string" && f.startsWith("ref:")) {
    buf = await store.getFile(userId, f.slice(4));
  } else if (typeof f === "string" && f.startsWith("tpl:")) {
    const p = path.join(TEMPLATES, path.basename(f.slice(4)));
    if (fs.existsSync(p)) buf = fs.readFileSync(p);
  }
  if (!buf) return null;
  try {
    const out = await sharp(buf).rotate().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    return { data: out, mime: "image/jpeg" };
  } catch {
    throw new Error("Arquivo de imagem inválido.");
  }
}

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  await recoverStale();
  const form = await req.formData();
  const type = String(form.get("type")) as GenType;
  const str = (k: string) => String(form.get(k) || "").trim();
  let cost = 0, summary = "";
  let params: any = {};
  const images: Record<string, Img> = {};
  const int = (k: string, min: number, max: number, def: number) => { const n = parseInt(str(k), 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  const envOf = (): Env => (str("env") === "interior" ? "interior" : "exterior");
  const need = async (key: string, msg: string) => {
    const i = await readImage(u.id, form, key);
    if (!i) throw new Error(msg);
    images[key] = i;
  };

  try {
    if (type === "mapa") {
      const address = str("address");
      const up = await readImage(u.id, form, "upload");
      if (up) images.upload = up;
      else if (!address) throw new Error("Digite um endereço ou envie um print.");
      params = { address, zoom: Number(str("zoom")) || 18 };
      cost = COSTS.mapa;
      summary = up ? "Mapa de situação (print enviado)" : `Mapa de situação — ${address}`;
    } else if (type === "moodboard") {
      const amb = str("ambiente") as AmbienteKey;
      if (!AMBIENTES[amb]) throw new Error("Escolha o ambiente.");
      await need("house", "Anexe a imagem da casa de referência.");
      await need("template", "Escolha um modelo da galeria ou envie um print.");
      params = { ambiente: amb };
      cost = COSTS.moodboard;
      summary = `Moodboard — ${AMBIENTES[amb].label}`;
    } else if (type === "render") {
      await need("model", "Envie o print do modelo 3D.");
      const ref = await readImage(u.id, form, "reference");
      if (ref) images.reference = ref;
      const versions = int("versions", 1, 4, 1);
      const mode = str("mode") === "precisao" ? "precisao" : "rapido";
      const prompt = str("prompt").slice(0, 4000) || composeRender({
        style: (str("style") in ESTILOS ? str("style") : "realista") as EstiloKey, level: int("level", 0, 2, 1), env: envOf(),
        guidance: str("guidance").slice(0, 500), scene: str("scene"), sceneFree: str("sceneFree").slice(0, 200),
        elements: str("elements").split(",").filter(Boolean), reference: !!ref,
      });
      params = { prompt, versions, size: mode === "precisao" ? "2K" : undefined };
      cost = renderCost(mode, versions);
      summary = `Render fotorrealista (${versions} ${versions === 1 ? "versão" : "versões"})`;
    } else if (type === "melhorar") {
      await need("render", "Envie o render que você quer melhorar.");
      const preset = (str("preset") in MELHORIAS ? str("preset") : "fidelidade") as MelhoriaKey;
      const versions = int("versions", 1, 4, 1);
      const prompt = str("prompt").slice(0, 4000) || composeMelhorar({ preset, creativity: int("creativity", 0, 100, 30), guidance: str("guidance").slice(0, 500) });
      params = { prompt, versions };
      cost = versions * COSTS.melhorarPorImagem;
      summary = `Melhorar render — ${MELHORIAS[preset].label}`;
    } else if (type === "esboco") {
      await need("sketch", "Envie o esboço ou desenho.");
      const versions = int("versions", 1, 4, 1);
      const prompt = str("prompt").slice(0, 4000) || composeEsboco({ env: envOf(), estilo: str("estilo"), detalhes: str("detalhes").slice(0, 240) });
      params = { prompt, versions };
      cost = versions * COSTS.esbocoPorImagem;
      summary = `Render de esboço (${versions} ${versions === 1 ? "versão" : "versões"})`;
    } else if (type === "ideias") {
      await need("base", "Envie a imagem de partida.");
      const ref = await readImage(u.id, form, "reference");
      if (ref) images.reference = ref;
      const env = envOf();
      const tipo = TIPOS_IDEIA[env].includes(str("tipo")) ? str("tipo") : TIPOS_IDEIA[env][0];
      const estilo = (ESTILOS_ARQ as readonly string[]).includes(str("estilo")) ? str("estilo") : ESTILOS_ARQ[0];
      const versions = int("versions", 1, 4, 2);
      const prompt = str("prompt").slice(0, 4000) || composeIdeia({ env, tipo, estilo, detalhes: str("detalhes").slice(0, 240), reference: !!ref });
      params = { prompt, versions };
      cost = versions * COSTS.ideiasPorImagem;
      summary = `Gerar ideias — ${tipo}, ${estilo}`;
    } else if (type === "luz") {
      await need("base", "Escolha um render ou envie uma imagem.");
      const k = str("luz");
      const livre = str("luzLivre");
      const desc = livre || LUZES[k as LuzKey]?.text;
      if (!desc) throw new Error("Escolha a iluminação ou descreva uma luz.");
      params = { descricao: livre ? `a custom light: ${livre}` : desc, rotulo: livre ? `Luz: ${livre}` : LUZES[k as LuzKey].label };
      cost = COSTS.luz;
      summary = `Variação de luz — ${params.rotulo}`;
    } else if (type === "filme") {
      await need("project", "Envie a imagem do projeto.");
      const cenas = str("cenas").split(",").filter((c) => CENAS[c as CenaKey]) as CenaKey[];
      if (cenas.length < 1 || cenas.length > 5) throw new Error("Escolha de 1 a 5 cenas.");
      params = { cenas };
      cost = cenas.length * (COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena);
      summary = `Filme do projeto — ${cenas.length} cena(s)`;
    } else throw new Error("Tipo inválido.");
  } catch (e: any) {
    return bad(e.message);
  }

  // projeto opcional: só vale se pertencer ao usuário
  const pid = str("projectId");
  const projectId = pid && (await store.getProject(pid, u.id)) ? pid : null;

  const id = uid();
  if (!(await charge(u.id, cost, summary, id))) return bad(`Créditos insuficientes: precisa de ${cost}, você tem ${u.credits}.`, 402);
  const gen: Generation = {
    id, userId: u.id, type, status: "queued", progress: 0, message: "Na fila…", createdAt: new Date().toISOString(),
    summary, outputs: [], cost, usage: { images: 0, videoClips: 0 }, projectId, favorite: false,
    mock: mockGemini() || (type === "mapa" && mockMaps() && !images.upload),
  };
  await store.saveGen(gen);
  enqueue(gen, { type, params, images });
  return NextResponse.json({ id });
}
