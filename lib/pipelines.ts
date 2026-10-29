import { env, mockGemini } from "./config";
import { Generation, Output, uid } from "./db";
import { persist } from "./persist";
import { store } from "./store";
import { generateImage, generateVideo, Img } from "./gemini";
import { concatClips, imageToClip } from "./ffmpeg";
import { mockImage } from "./mock";
import { satellite } from "./maps";

import { AMBIENTES, AmbienteKey, CENAS, CenaKey, PROMPT_MAPA, promptLuz, promptMoodboard } from "./prompts";

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

async function mapa(c: Ctx) {
  const { address, zoom } = c.input.params;
  let sat: Img;
  if (c.input.images.upload) sat = c.input.images.upload;
  else {
    progress(c, 10, "Buscando imagem de satélite (Google Maps)…");
    sat = asImg(await satellite(address, Number(zoom) || 18));
  }
  await addOutput(c, sat.data, ext(sat.data), "image", "Satélite (entrada)");
  progress(c, 35, "Gerando mapa de situação…");
  c.gen.prompt = PROMPT_MAPA;
  const out = await makeImage(c, "Mapa de situação", PROMPT_MAPA, [sat]);
  await addOutput(c, out, ext(out), "image", "Mapa de situação");
  c.gen.outputs.reverse(); // resultado primeiro
}

async function moodboard(c: Ctx) {
  const amb = c.input.params.ambiente as AmbienteKey;
  const prompt = promptMoodboard(amb);
  c.gen.prompt = prompt;
  progress(c, 20, `Gerando moodboard de ${AMBIENTES[amb].label.toLowerCase()}…`);
  const out = await makeImage(c, `Moodboard — ${AMBIENTES[amb].label}`, prompt, [c.input.images.house, c.input.images.template], "2:3");
  await addOutput(c, out, ext(out), "image", `Moodboard — ${AMBIENTES[amb].label}`);
}

/** Gera N versões em paralelo a partir do mesmo prompt e das imagens de entrada (render, melhorar, esboço e ideias). */
async function variants(c: Ctx, label: string, imgs: Img[]) {
  const prompt: string = c.input.params.prompt;
  const n: number = c.input.params.versions || 1;
  const size: string | undefined = c.input.params.size;
  c.gen.prompt = prompt;
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

const withRef = (c: Ctx, key: string) => [c.input.images[key], ...(c.input.images.reference ? [c.input.images.reference] : [])];
async function render(c: Ctx) { await variants(c, "Render", withRef(c, "model")); }
async function melhorar(c: Ctx) { await variants(c, "Render melhorado", withRef(c, "render")); }
async function esboco(c: Ctx) { await variants(c, "Render do esboço", withRef(c, "sketch")); }
async function ideias(c: Ctx) { await variants(c, "Ideia", withRef(c, "base")); }

async function luz(c: Ctx) {
  const prompt = promptLuz(c.input.params.descricao);
  c.gen.prompt = prompt;
  progress(c, 20, "Gerando nova iluminação…");
  const out = await makeImage(c, `Luz: ${c.input.params.rotulo}`, prompt, [c.input.images.base]);
  await addOutput(c, out, ext(out), "image", c.input.params.rotulo);
}

async function filme(c: Ctx) {
  const cenas: CenaKey[] = c.input.params.cenas;
  const n = cenas.length;
  const clips: Buffer[] = [];
  for (let i = 0; i < n; i++) {
    const cena = CENAS[cenas[i]];
    const base = (i / n) * 90;
    const slice = 90 / n;
    progress(c, base + slice * 0.05, `Cena ${i + 1}/${n} (${cena.label}): gerando imagem…`);
    const img = await makeImage(c, `Cena ${cena.label}`, cena.img, [c.input.images.project], "16:9");
    await addOutput(c, img, ext(img), "image", `Cena: ${cena.label}`);
    progress(c, base + slice * 0.3, `Cena ${i + 1}/${n} (${cena.label}): gerando clipe de vídeo…`);
    c.gen.usage.videoClips++;
    if (mockGemini()) clips.push(await imageToClip(img, env.clipSeconds || 5));
    else clips.push(await generateVideo(cena.video, asImg(img)));
  }
  progress(c, 93, "Montando o filme final com ffmpeg…");
  const final = await concatClips(clips, env.clipSeconds);
  await addOutput(c, final, "mp4", "video", "Filme do projeto (1920x1080)");
  c.gen.outputs.sort((a) => (a.kind === "video" ? -1 : 1));
}

const handlers = { mapa, moodboard, render, luz, filme, melhorar, esboco, ideias };

export async function runPipeline(gen: Generation, input: JobInput) {
  await handlers[input.type]({ gen, input });
}
