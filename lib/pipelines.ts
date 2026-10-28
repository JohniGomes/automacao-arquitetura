import { env, mockGemini } from "./config";
import { Generation, Output, save, uid } from "./db";
import { generateImage, generateVideo, Img } from "./gemini";
import { concatClips, imageToClip } from "./ffmpeg";
import { mockImage } from "./mock";
import { satellite } from "./maps";
import { saveFile, mimeOf } from "./storage";
import { AMBIENTES, AmbienteKey, CENAS, CenaKey, PROMPT_MAPA, promptLuz, promptMoodboard } from "./prompts";

export type JobInput = { type: Generation["type"]; params: any; images: Record<string, Img> };

type Ctx = { gen: Generation; input: JobInput };

function progress(c: Ctx, pct: number, msg: string) {
  c.gen.progress = Math.min(99, Math.round(pct));
  c.gen.message = msg;
  save();
}

async function makeImage(c: Ctx, label: string, prompt: string, imgs: Img[], aspect?: string): Promise<Buffer> {
  c.gen.usage.images++;
  if (mockGemini()) {
    await new Promise((r) => setTimeout(r, 900));
    return mockImage(label, aspect === "2:3" ? 800 : 1280, aspect === "2:3" ? 1200 : 720, label + prompt.length);
  }
  return generateImage(prompt, imgs, aspect);
}

function addOutput(c: Ctx, buf: Buffer, ext: string, kind: Output["kind"], label?: string) {
  const file = saveFile(c.gen.userId, `${c.gen.id}-${uid().slice(0, 6)}.${ext}`, buf);
  c.gen.outputs.push({ file, kind, label });
  save();
}
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
  addOutput(c, sat.data, ext(sat.data), "image", "Satélite (entrada)");
  progress(c, 35, "Gerando mapa de situação…");
  c.gen.prompt = PROMPT_MAPA;
  const out = await makeImage(c, "Mapa de situação", PROMPT_MAPA, [sat]);
  addOutput(c, out, ext(out), "image", "Mapa de situação");
  c.gen.outputs.reverse(); // resultado primeiro
}

async function moodboard(c: Ctx) {
  const amb = c.input.params.ambiente as AmbienteKey;
  const prompt = promptMoodboard(amb);
  c.gen.prompt = prompt;
  progress(c, 20, `Gerando moodboard de ${AMBIENTES[amb].label.toLowerCase()}…`);
  const out = await makeImage(c, `Moodboard — ${AMBIENTES[amb].label}`, prompt, [c.input.images.house, c.input.images.template], "2:3");
  addOutput(c, out, ext(out), "image", `Moodboard — ${AMBIENTES[amb].label}`);
}

async function render(c: Ctx) {
  const prompt: string = c.input.params.prompt;
  c.gen.prompt = prompt;
  const n = 4;
  let done = 0;
  const jobs = Array.from({ length: n }, (_, i) =>
    makeImage(c, `Render versão ${i + 1}`, prompt, [c.input.images.model]).then((b) => {
      addOutput(c, b, ext(b), "image", `Versão ${i + 1}`);
      progress(c, (++done / n) * 95, `${done} de ${n} versões prontas`);
    }));
  const res = await Promise.allSettled(jobs);
  const failed = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failed.length === n) throw failed[0].reason;
  if (failed.length) c.gen.message = `${n - failed.length} de ${n} versões geradas (algumas falharam).`;
}

async function luz(c: Ctx) {
  const prompt = promptLuz(c.input.params.descricao);
  c.gen.prompt = prompt;
  progress(c, 20, "Gerando nova iluminação…");
  const out = await makeImage(c, `Luz: ${c.input.params.rotulo}`, prompt, [c.input.images.base]);
  addOutput(c, out, ext(out), "image", c.input.params.rotulo);
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
    addOutput(c, img, ext(img), "image", `Cena: ${cena.label}`);
    progress(c, base + slice * 0.3, `Cena ${i + 1}/${n} (${cena.label}): gerando clipe de vídeo…`);
    c.gen.usage.videoClips++;
    if (mockGemini()) clips.push(await imageToClip(img, env.clipSeconds || 5));
    else clips.push(await generateVideo(cena.video, asImg(img)));
  }
  progress(c, 93, "Montando o filme final com ffmpeg…");
  const final = await concatClips(clips, env.clipSeconds);
  addOutput(c, final, "mp4", "video", "Filme do projeto (1920x1080)");
  c.gen.outputs.sort((a) => (a.kind === "video" ? -1 : 1));
}

const handlers = { mapa, moodboard, render, luz, filme };

export async function runPipeline(gen: Generation, input: JobInput) {
  await handlers[input.type]({ gen, input });
}
