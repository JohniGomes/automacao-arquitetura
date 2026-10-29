import sharp from "sharp";
import { env, mockGemini, mockVideo } from "./config";
import { Generation, Output, uid } from "./db";
import { persist } from "./persist";
import { store } from "./store";
import { describeProject, generateImage, generateVideo, Img } from "./ai";
import { concatClips, imageToClip } from "./ffmpeg";
import { mockEdit, mockImage } from "./mock";
import { composeEdit } from "./compose";
import { satellite } from "./maps";
import { AMBIENTES, AmbienteKey, CENAS, CenaDef, CenaKey, PROMPT_BIBLIA, PROMPT_MAPA, promptLuz, promptMoodboard, REF_PREFIX } from "./prompts";

export type JobInput = { type: Generation["type"]; params: any; images: Record<string, Img> };

type Ctx = { gen: Generation; input: JobInput };

function progress(c: Ctx, pct: number, msg: string) {
  c.gen.progress = Math.min(99, Math.round(pct));
  c.gen.message = msg;
  void persist(c.gen);
}

async function makeImage(c: Ctx, label: string, prompt: string, imgs: Img[], aspect?: string, size?: string): Promise<Buffer> {
  c.gen.usage.images++;
  if (mockGemini()) {
    await new Promise((r) => setTimeout(r, 900));
    return mockImage(label, aspect === "2:3" ? 800 : 1280, aspect === "2:3" ? 1200 : 720, label + prompt.length);
  }
  return generateImage(prompt, imgs, aspect, size);
}

async function addOutput(c: Ctx, buf: Buffer, ext: string, kind: Output["kind"], label?: string) {
  const file = `${c.gen.id}-${uid().slice(0, 6)}.${ext}`;
  await store.putFile(c.gen.userId, file, buf);
  c.gen.outputs.push({ file, kind, label });
  void persist(c.gen);
}
const mimeOf = (buf: Buffer) =>
  buf[0] === 0xff ? "image/jpeg" : buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : "image/png";
const asImg = (b: Buffer): Img => ({ data: b, mime: mimeOf(b) });
const ext = (b: Buffer) => (mimeOf(b) === "image/jpeg" ? "jpg" : mimeOf(b) === "image/webp" ? "webp" : "png");

/**
 * Snapshot do prompt final: provedor, modelo, opções usadas e o texto exato enviado. Fica gravado na geração
 * para reproduzir e comparar os testes.
 */
function snap(c: Ctx, prompt: string, extra?: Record<string, unknown>): string {
  const { prompt: _p, angles: _a, regions: _r, ...opts } = c.input.params || {};
  const model = env.imageProvider === "grok" ? env.grokImageModel : env.imageModel;
  return `[Provedor: ${env.imageProvider} · Modelo: ${model}]\n[Opções: ${JSON.stringify({ ...opts, ...extra })}]\n\n${prompt}`;
}

async function mapa(c: Ctx) {
  const { address, zoom } = c.input.params;
  let sat: Img;
  if (c.input.images.upload) sat = c.input.images.upload;
  else {
    progress(c, 10, "Buscando imagem de satélite (Google Maps)…");
    sat = asImg(await satellite(address, Number(zoom) || 18));
  }
  await addOutput(c, sat.data, ext(sat.data), "image", "Satélite (entrada)");
  progress(c, 35, "Gerando o mapa de situação…");
  c.gen.prompt = snap(c, PROMPT_MAPA);
  const out = await makeImage(c, "Mapa de situação", PROMPT_MAPA, [sat]);
  await addOutput(c, out, ext(out), "image", "Mapa de situação");
  c.gen.outputs.reverse(); // resultado primeiro
}

async function moodboard(c: Ctx) {
  const amb = c.input.params.ambiente as AmbienteKey;
  const prompt = promptMoodboard(amb);
  c.gen.prompt = snap(c, prompt);
  progress(c, 20, `Gerando moodboard de ${AMBIENTES[amb].label.toLowerCase()}…`);
  // ordem declarada no prompt: imagem 1 = casa, imagem 2 = layout
  // a proporção da saída segue a do modelo escolhido (a mais próxima entre as aceitas pela IA)
  const tm = await sharp(c.input.images.template.data).metadata();
  const ratio = (tm.width || 2) / (tm.height || 3);
  const aspect = (["9:16", "2:3", "3:4", "4:5", "1:1", "5:4", "4:3", "3:2", "16:9"] as const).reduce<string>((best, a) => {
    const [w, h] = a.split(":").map(Number);
    const [bw, bh] = best.split(":").map(Number);
    return Math.abs(w / h - ratio) < Math.abs(bw / bh - ratio) ? a : best;
  }, "2:3");
  const out = await makeImage(c, `Moodboard — ${AMBIENTES[amb].label}`, prompt, [c.input.images.house, c.input.images.template], aspect);
  await addOutput(c, out, ext(out), "image", `Moodboard — ${AMBIENTES[amb].label}`);
}

/** Gera N versões em paralelo a partir do mesmo prompt e das imagens de entrada (render, melhorar, esboço e ideias). */
async function variants(c: Ctx, label: string, imgs: Img[]) {
  const prompt: string = c.input.params.prompt;
  const n: number = c.input.params.versions || 1;
  const size: string | undefined = c.input.params.size;
  c.gen.prompt = snap(c, prompt);
  let done = 0;
  const jobs = Array.from({ length: n }, (_, i) =>
    makeImage(c, `${label} ${i + 1}`, prompt, imgs, undefined, size).then(async (b) => {
      await addOutput(c, b, ext(b), "image", n > 1 ? `${label} — versão ${i + 1}` : label);
      progress(c, (++done / n) * 95, `${done} de ${n} versões prontas`);
    }));
  const res = await Promise.allSettled(jobs);
  const failed = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failed.length === n) throw failed[0].reason;
  if (failed.length) c.gen.message = `${n - failed.length} de ${n} versões geradas (algumas falharam).`;
}

// a ordem das imagens enviadas é a declarada nos prompts: imagem 1 = a base, imagem 2 = referência (se houver)
const withRef = (c: Ctx, key: string) => [c.input.images[key], ...(c.input.images.reference ? [c.input.images.reference] : [])];
async function render(c: Ctx) { await variants(c, "Render", withRef(c, "model")); }
async function melhorar(c: Ctx) { await variants(c, "Render melhorado", [c.input.images.render]); }
async function esboco(c: Ctx) { await variants(c, "Render do esboço", [c.input.images.sketch]); }
async function ideias(c: Ctx) { await variants(c, "Ideia", withRef(c, "base")); }

async function luz(c: Ctx) {
  const prompt = promptLuz(c.input.params.descricao);
  c.gen.prompt = snap(c, prompt);
  progress(c, 20, "Gerando nova iluminação…");
  const out = await makeImage(c, `Luz: ${c.input.params.rotulo}`, prompt, [c.input.images.base]);
  await addOutput(c, out, ext(out), "image", c.input.params.rotulo);
}

/** Bíblia visual: descrição de continuidade do projeto, criada uma vez e reaproveitada em todas as cenas. */
async function visualBible(c: Ctx): Promise<string | null> {
  if (mockGemini()) return "- (modo mock) especificação visual de exemplo: volumes, materiais e aberturas do projeto.";
  try {
    return await describeProject(PROMPT_BIBLIA, [c.input.images.project]);
  } catch (e: any) {
    console.warn("Bíblia visual não gerada (as cenas seguem sem ela):", e?.message || e);
    return null;
  }
}

async function filme(c: Ctx) {
  const cenas: CenaKey[] = c.input.params.cenas;
  const n = cenas.length;
  const clips: Buffer[] = [];

  progress(c, 3, "Analisando o projeto para manter a continuidade entre as cenas…");
  const bible = await visualBible(c);
  const bibleBlock = bible ? `\n\nPROJECT VISUAL CONTINUITY SPECIFICATION (shared by all scenes):\n${bible}` : "";
  c.gen.prompt = snap(c, bible ? `PROJECT VISUAL CONTINUITY SPECIFICATION (shared by all scenes):\n${bible}` : "(bíblia visual não gerada: as cenas seguem sem a descrição de continuidade)");
  if (!bible) c.gen.message = "Sem a bíblia visual (modelo de texto indisponível): as cenas seguem só com a imagem do projeto.";

  for (let i = 0; i < n; i++) {
    const cena: CenaDef = CENAS[cenas[i]];
    const base = 5 + (i / n) * 85;
    const slice = 85 / n;
    // cena com referência dedicada recebe a imagem 2 (ex.: interior); as demais partem só da imagem do projeto
    const ref = cena.ref ? c.input.images[cena.ref] : undefined;
    const imgs = [c.input.images.project, ...(ref ? [ref] : [])];
    const imgPrompt = (ref ? REF_PREFIX : "") + cena.img + bibleBlock;

    progress(c, base + slice * 0.05, `Cena ${i + 1}/${n} (${cena.label}): gerando imagem…`);
    const img = await makeImage(c, `Cena ${cena.label}`, imgPrompt, imgs, "16:9");
    await addOutput(c, img, ext(img), "image", `Cena: ${cena.label}`);
    progress(c, base + slice * 0.3, `Cena ${i + 1}/${n} (${cena.label}): gerando clipe de vídeo…`);
    c.gen.usage.videoClips++;
    if (mockVideo()) clips.push(await imageToClip(img, env.clipSeconds || 5));
    else {
      // link assinado da imagem da cena (o xAI pede a imagem por URL); sem Supabase fica null e vai em base64
      const url = await store.fileUrl(c.gen.userId, c.gen.outputs[c.gen.outputs.length - 1].file, false).catch(() => null);
      clips.push(await generateVideo(cena.video, asImg(img), url));
    }
  }
  progress(c, 93, "Montando o filme final com ffmpeg…");
  const final = await concatClips(clips, env.clipSeconds);
  await addOutput(c, final, "mp4", "video", "Filme do projeto (1920x1080)");
  c.gen.outputs.sort((a) => (a.kind === "video" ? -1 : 1));
}

/**
 * Garantia por código: o modelo pode alterar pixels fora da máscara. Recompõe a imagem original fora da região
 * autorizada, com uma transição estreita (desfoque de 1,2 px) na borda para evitar emendas visíveis.
 * Devolve null quando a proporção da saída difere da entrada (não dá para alinhar com segurança).
 */
async function recompose(orig: Img, edited: Buffer, mask: Img): Promise<Buffer | null> {
  const om = await sharp(orig.data).metadata();
  const em = await sharp(edited).metadata();
  const W = om.width!, H = om.height!;
  if (!em.width || !em.height || Math.abs(W / H - em.width / em.height) / (W / H) > 0.03) return null;
  // PNG nas etapas intermediárias: sem formato explícito o sharp reencoda JPEG com perdas e mudaria pixels fora da máscara
  const base = await sharp(orig.data).removeAlpha().png().toBuffer();
  const e = await sharp(edited).resize(W, H, { fit: "fill" }).removeAlpha().png().toBuffer();
  const alpha = await sharp(mask.data).resize(W, H, { fit: "fill" }).greyscale().blur(1.2).raw().toBuffer();
  const eAlpha = await sharp(e).joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return sharp(base).composite([{ input: eAlpha }]).png().toBuffer();
}

/** Edita região por região: cada região usa o resultado da anterior e sua própria máscara. */
async function editor(c: Ctx) {
  const regions: { text: string }[] = c.input.params.regions;
  const n = regions.length;
  let current = c.input.images.base;
  c.gen.prompt = snap(c, `${composeEdit(regions[0].text)}\n\n(a mesma estrutura se repete para cada região; instruções:)\n${regions.map((r, i) => `Região ${i + 1}: ${r.text}`).join("\n")}`, { regioes: n });
  let semRecorte = false;
  for (let i = 0; i < n; i++) {
    progress(c, (i / n) * 95 + 3, `Editando a região ${i + 1} de ${n}…`);
    const mask = c.input.images[`mask${i + 1}`];
    c.gen.usage.images++;
    let out: Buffer;
    // ordem declarada no prompt: imagem 1 = imagem atual, imagem 2 = máscara
    if (mockGemini()) { await new Promise((r) => setTimeout(r, 900)); out = await mockEdit(current.data, mask.data, i); }
    else {
      out = await generateImage(composeEdit(regions[i].text), [current, mask]);
      const fixed = await recompose(current, out, mask).catch((e) => { console.warn("recompose falhou:", e?.message || e); return null; });
      if (fixed) out = fixed; else semRecorte = true;
    }
    current = asImg(out);
  }
  if (semRecorte) c.gen.message = "Concluído. O formato da imagem devolvida difere do original: o recorte por máscara não pôde ser aplicado, confira as áreas fora da região.";
  await addOutput(c, current.data, ext(current.data), "image", n > 1 ? `Editada (${n} regiões)` : "Editada");
}

/** Gera cada ângulo em paralelo e, no modo mosaico, junta tudo em uma imagem. */
async function angulos(c: Ctx) {
  const list: { label: string; prompt: string }[] = c.input.params.angles;
  const n = list.length;
  c.gen.prompt = snap(c, `${list[0].prompt}\n\n(estrutura repetida para cada ângulo; ângulos:)\n${list.map((a) => a.label).join("\n")}`, { angulos: n });
  const got: { label: string; buf: Buffer }[] = [];
  let done = 0;
  const res = await Promise.allSettled(list.map((a, i) =>
    makeImage(c, `Ângulo ${i + 1}`, a.prompt, [c.input.images.base]).then(async (b) => {
      got[i] = { label: a.label, buf: b };
      await addOutput(c, b, ext(b), "image", a.label);
      progress(c, (++done / n) * 90, `${done} de ${n} ângulos prontos`);
    })));
  const failed = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failed.length === n) throw failed[0].reason;
  if (failed.length) c.gen.message = `${n - failed.length} de ${n} ângulos gerados (alguns falharam).`;
  const ok = got.filter(Boolean);
  if (c.input.params.mosaic && ok.length >= 2) {
    progress(c, 94, "Montando o mosaico…");
    const meta = await sharp(ok[0].buf).metadata();
    const cw = 640, ch = Math.round((cw * (meta.height || 720)) / (meta.width || 1280)), gap = 12;
    const cols = ok.length <= 4 ? 2 : 3, rows = Math.ceil(ok.length / cols);
    const cells = await Promise.all(ok.map(async (o, i) => ({
      input: await sharp(o.buf).resize(cw, ch, { fit: "cover" }).png().toBuffer(),
      left: gap + (i % cols) * (cw + gap), top: gap + Math.floor(i / cols) * (ch + gap),
    })));
    const mosaic = await sharp({ create: { width: gap + cols * (cw + gap), height: gap + rows * (ch + gap), channels: 3, background: "#F4EFE8" } }).composite(cells).png().toBuffer();
    await addOutput(c, mosaic, "png", "image", "Mosaico");
    c.gen.outputs.unshift(c.gen.outputs.pop()!);
  }
}

const handlers = { mapa, moodboard, render, luz, filme, melhorar, esboco, ideias, editor, angulos };

export async function runPipeline(gen: Generation, input: JobInput) {
  await handlers[input.type]({ gen, input });
}
