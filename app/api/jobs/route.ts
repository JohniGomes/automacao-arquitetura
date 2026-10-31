import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { charge, COSTS } from "@/lib/credits";
import { renderCost, COSTS_EDICAO } from "@/lib/costs";
import { ANGULOS, angleLabel, composeAngle, LENTES, LenteKey, MAX_REGIOES, composeEsboco, composeIdeia, composeMelhorar, composeRender, ESTILOS, ESTILOS_ARQ, EstiloKey, Env, MELHORIAS, MelhoriaKey, TIPOS_IDEIA } from "@/lib/compose";
import { Generation, GenType, uid } from "@/lib/db";
import { activeJobs, enqueue, live, MAX_ACTIVE_PER_USER, recoverStale } from "@/lib/jobs";
import { limited } from "@/lib/ratelimit";
import { refund } from "@/lib/credits";
import { ELEMENTOS, CENAS_LUZ } from "@/lib/compose";
import { Img } from "@/lib/gemini";
import { env, mockGemini, mockMaps, mockVideo } from "@/lib/config";
import { store } from "@/lib/store";
import { pub } from "@/lib/public";
import { AMBIENTES, AmbienteKey, CENAS, CenaKey, LUZES, LuzKey } from "@/lib/prompts";

export const runtime = "nodejs";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const TEMPLATES = path.join(process.cwd(), "templates", "moodboards");
/** corpo máximo de um pedido (filme: até 4 imagens; editor: até 8 máscaras) */
const MAX_BODY = 60 * 1024 * 1024;

export async function GET() {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  await recoverStale();
  const list = (await store.listGens(u.id)).map((g) => live.get(g.id) ?? g);
  return NextResponse.json({ credits: u.credits, generations: list.map(pub) });
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
    // PNG com transparência viraria fundo preto: achata em branco antes de enviar à IA
    const out = await sharp(buf).rotate().flatten({ background: "#ffffff" }).resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    return { data: out, mime: "image/jpeg" };
  } catch {
    throw new Error("Arquivo de imagem inválido.");
  }
}

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  await recoverStale();
  // limites antes de ler o corpo: o formData carrega tudo na memória
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return bad("Os arquivos enviados são grandes demais.", 413);
  if (limited(`jobs:${u.id}`, 20, 10 * 60_000)) return bad("Muitos pedidos em pouco tempo. Aguarde um pouco e tente de novo.", 429);
  if (activeJobs(u.id) >= MAX_ACTIVE_PER_USER) return bad(`Você já tem ${MAX_ACTIVE_PER_USER} gerações em andamento. Aguarde uma terminar para pedir outra.`, 429);
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
      const address = str("address").slice(0, 200);
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
      const prompt = composeRender({
        style: (str("style") in ESTILOS ? str("style") : "realista") as EstiloKey, level: int("level", 0, 2, 1), env: envOf(),
        guidance: str("guidance").slice(0, 500), scene: CENAS_LUZ.some((s) => s.id === str("scene")) ? str("scene") : "", sceneFree: str("sceneFree").slice(0, 200),
        elements: str("elements").split(",").filter((x) => ELEMENTOS.some((e) => e.id === x)).slice(0, ELEMENTOS.length), reference: !!ref,
      });
      params = { prompt, versions, size: mode === "precisao" ? "2K" : undefined };
      cost = renderCost(mode, versions);
      summary = `Render fotorrealista (${versions} ${versions === 1 ? "versão" : "versões"})`;
    } else if (type === "melhorar") {
      await need("render", "Envie o render que você quer melhorar.");
      const preset = (str("preset") in MELHORIAS ? str("preset") : "fidelidade") as MelhoriaKey;
      const versions = int("versions", 1, 4, 1);
      const prompt = composeMelhorar({ preset, creativity: int("creativity", 0, 100, 30), guidance: str("guidance").slice(0, 500) });
      params = { prompt, versions };
      cost = versions * COSTS.melhorarPorImagem;
      summary = `Melhorar render — ${MELHORIAS[preset].label}`;
    } else if (type === "esboco") {
      await need("sketch", "Envie o esboço ou desenho.");
      const versions = int("versions", 1, 4, 1);
      const prompt = composeEsboco({ env: envOf(), estilo: (ESTILOS_ARQ as readonly string[]).includes(str("estilo")) ? str("estilo") : "", detalhes: str("detalhes").slice(0, 240) });
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
      const prompt = composeIdeia({ env, tipo, estilo, detalhes: str("detalhes").slice(0, 240), reference: !!ref });
      params = { prompt, versions };
      cost = versions * COSTS.ideiasPorImagem;
      summary = `Gerar ideias — ${tipo}, ${estilo}`;
    } else if (type === "editor") {
      await need("base", "Envie a imagem que você quer editar.");
      const meta = await sharp(images.base.data).metadata();
      const regions: { text: string }[] = [];
      for (let i = 1; i <= MAX_REGIOES; i++) {
        const f = form.get(`mask${i}`);
        if (!(f instanceof File) || f.size === 0) continue;
        if (f.size > 8 * 1024 * 1024) throw new Error("Máscara acima de 8 MB.");
        const text = str(`text${i}`).slice(0, 300);
        if (!text) throw new Error(`Escreva a instrução da região ${regions.length + 1}.`);
        const buf = await sharp(Buffer.from(await f.arrayBuffer())).resize(meta.width!, meta.height!, { fit: "fill" }).greyscale().threshold(128).png().toBuffer();
        if ((await sharp(buf).stats()).channels[0].max < 128) throw new Error(`A região ${regions.length + 1} está vazia: desenhe sobre a imagem.`);
        regions.push({ text });
        images[`mask${regions.length}`] = { data: buf, mime: "image/png" };
      }
      if (!regions.length) throw new Error("Marque ao menos uma região na imagem.");
      params = { regions };
      cost = regions.length * COSTS_EDICAO.editorPorRegiao;
      summary = `Edição por regiões (${regions.length} ${regions.length === 1 ? "região" : "regiões"})`;
    } else if (type === "angulos") {
      await need("base", "Envie a imagem de partida.");
      const lens = (str("lens") in LENTES ? str("lens") : "normal") as LenteKey;
      const mosaic = str("mode") === "mosaico";
      let angles: { label: string; prompt: string }[] = [];
      if (!mosaic && str("az") !== "") {
        const az = Math.max(-180, Math.min(180, Number(str("az")) || 0));
        const el = Math.max(-60, Math.min(90, Number(str("el")) || 0));
        angles = [{ label: angleLabel(az, el), prompt: composeAngle({ az, el, lens }) }];
      } else {
        const sel = ANGULOS.filter((a) => str("angles").split(",").includes(a.id)).slice(0, 6);
        if (mosaic && sel.length < 2) throw new Error("No mosaico, escolha ao menos 2 ângulos.");
        if (!sel.length) throw new Error("Escolha o ângulo.");
        angles = sel.map((a) => ({ label: a.label, prompt: composeAngle({ az: a.az, el: a.el, lens }) }));
      }
      params = { angles, mosaic };
      cost = angles.length * COSTS_EDICAO.anguloPorImagem;
      summary = mosaic ? `Multi-ângulo — mosaico de ${angles.length}` : `Multi-ângulo — ${angles[0].label}`;
    } else if (type === "luz") {
      await need("base", "Escolha um render ou envie uma imagem.");
      const k = str("luz");
      const livre = str("luzLivre").slice(0, 200);
      const desc = livre || LUZES[k as LuzKey]?.text;
      if (!desc) throw new Error("Escolha a iluminação ou descreva uma luz.");
      params = { descricao: desc, rotulo: livre ? `Luz: ${livre}` : LUZES[k as LuzKey].label };
      cost = COSTS.luz;
      summary = `Variação de luz — ${params.rotulo}`;
    } else if (type === "filme") {
      if (env.filmeRequerCompra && !(await store.listTxs(u.id, 5000)).some((t) => /^(Compra|Plano)/.test(t.reason)))
        throw new Error("O filme do projeto é liberado para quem tem plano ou já comprou créditos.");
      await need("project", "Envie a imagem do projeto.");
      const cenas = str("cenas").split(",").filter((c) => CENAS[c as CenaKey]) as CenaKey[];
      if (cenas.length < 1 || cenas.length > 5) throw new Error("Escolha de 1 a 5 cenas.");
      // referências dedicadas (imagem 2 das cenas Interior, Fachada e Acesso)
      for (const k of ["interior", "fachada", "acesso"] as const) {
        const r = await readImage(u.id, form, k);
        if (r) images[k] = r;
      }
      if (cenas.includes("interior" as CenaKey) && !images.interior) throw new Error("A cena Interior precisa de uma imagem interior de referência: o app não inventa um ambiente que não existe no projeto.");
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
    mock: mockGemini() || (type === "filme" && mockVideo()) || (type === "mapa" && mockMaps() && !images.upload),
  };
  try { await store.saveGen(gen); }
  catch (e) {
    // não conseguiu registrar a geração: devolve o crédito já cobrado em vez de deixar o usuário sem nada
    console.error("saveGen falhou, estornando:", (e as Error)?.message);
    await refund(u.id, cost, "Estorno: geração não registrada", id).catch((er) => console.error("estorno falhou:", er));
    return bad("Não foi possível iniciar a geração. Tente novamente.", 500);
  }
  enqueue(gen, { type, params, images });
  return NextResponse.json({ id });
}
