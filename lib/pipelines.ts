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
import { refund } from "./credits";
import { UserError } from "./errors";
import { COSTS } from "./costs";

/** Proporção aceita pela IA mais próxima da imagem: a saída mantém o enquadramento da entrada. */
async function nearestAspect(buf: Buffer, fallback = "2:3"): Promise<string> {
  const m = await sharp(buf).metadata().catch(() => null);
  const ratio = m?.width && m?.height ? m.width / m.height : 2 / 3;
  return (["9:16", "2:3", "3:4", "4:5", "1:1", "5:4", "4:3", "3:2", "16:9"] as const).reduce<string>((best, a) => {
    const [w, h] = a.split(":").map(Number);
    const [bw, bh] = best.split(":").map(Number);
    return Math.abs(w / h - ratio) < Math.abs(bw / bh - ratio) ? a : best;
  }, fallback);
}

/** Devolve créditos de uma parte que não foi entregue e registra o total devolvido (o estorno final desconta isso). */
async function refundPart(c: Ctx, amount: number, reason: string) {
  const v = Math.max(0, Math.min(Math.round(amount), c.gen.cost - (c.gen.refunded || 0)));
  if (!v) return;
  c.gen.refunded = (c.gen.refunded || 0) + v;
  await refund(c.gen.userId, v, reason, c.gen.id).catch((e) => console.error("estorno parcial falhou:", e));
}

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
  return `[Modelo: ${env.imageModel}]\n[Opções: ${JSON.stringify({ ...opts, ...extra })}]\n\n${prompt}`;
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
  const out = await makeImage(c, "Mapa de situação", PROMPT_MAPA, [sat], await nearestAspect(sat.data, "1:1"));
  await addOutput(c, out, ext(out), "image", "Mapa de situação");
  c.gen.outputs.reverse(); // resultado primeiro
}

async function moodboard(c: Ctx) {
  const amb = c.input.params.ambiente as AmbienteKey;
  const prompt = promptMoodboard(amb);
  c.gen.prompt = snap(c, prompt);
  progress(c, 20, `Gerando moodboard de ${AMBIENTES[amb].label.toLowerCase()}…`);
  // ordem declarada no prompt: imagem 1 = casa, imagem 2 = layout
  // a proporção da saída segue a do modelo escolhido
  const aspect = await nearestAspect(c.input.images.template.data);
  // o modelo vai em tons de cinza: assim ele só define a estrutura e nenhuma cor dele pode vazar para o resultado
  const gray: Img = { data: await sharp(c.input.images.template.data).grayscale().jpeg({ quality: 92 }).toBuffer(), mime: "image/jpeg" };
  const out = await makeImage(c, `Moodboard — ${AMBIENTES[amb].label}`, prompt, [c.input.images.house, gray], aspect);
  await addOutput(c, out, ext(out), "image", `Moodboard — ${AMBIENTES[amb].label}`);
}

/** Gera N versões em paralelo a partir do mesmo prompt e das imagens de entrada (render, melhorar, esboço e ideias). */
async function variants(c: Ctx, label: string, imgs: Img[]) {
  const prompt: string = c.input.params.prompt;
  const n: number = c.input.params.versions || 1;
  const size: string | undefined = c.input.params.size;
  c.gen.prompt = snap(c, prompt);
  const aspect = await nearestAspect(imgs[0].data, "16:9");
  let done = 0;
  const jobs = Array.from({ length: n }, (_, i) =>
    makeImage(c, `${label} ${i + 1}`, prompt, imgs, aspect, size).then(async (b) => {
      await addOutput(c, b, ext(b), "image", n > 1 ? `${label} — versão ${i + 1}` : label);
      progress(c, (++done / n) * 95, `${done} de ${n} versões prontas`);
    }));
  const res = await Promise.allSettled(jobs);
  const failed = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failed.length === n) throw failed[0].reason;
  if (failed.length) {
    c.gen.message = `${n - failed.length} de ${n} versões geradas (algumas falharam).`;
    await refundPart(c, (c.gen.cost / n) * failed.length, "Estorno: versões que falharam");
  }
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
  const out = await makeImage(c, `Luz: ${c.input.params.rotulo}`, prompt, [c.input.images.base], await nearestAspect(c.input.images.base.data, "16:9"));
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
  let skipped = 0, fallback = 0;

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

    const sceneCost = COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena;

    progress(c, base + slice * 0.05, `Cena ${i + 1}/${n} (${cena.label}): gerando imagem…`);
    let img: Buffer;
    try {
      img = await makeImage(c, `Cena ${cena.label}`, imgPrompt, imgs, "16:9");
    } catch (e) {
      // cena sem imagem: pula e devolve o que ela custaria; as outras seguem
      console.warn(`filme: cena ${cena.label} sem imagem:`, (e as Error)?.message);
      await refundPart(c, sceneCost, "Estorno: cena que falhou");
      skipped++;
      continue;
    }
    await addOutput(c, img, ext(img), "image", `Cena: ${cena.label}`);
    progress(c, base + slice * 0.3, `Cena ${i + 1}/${n} (${cena.label}): gerando clipe de vídeo…`);
    c.gen.usage.videoClips++;
    try {
      if (mockVideo()) clips.push(await imageToClip(img, env.clipSeconds));
      else clips.push(await generateVideo(cena.video, asImg(img)));
    } catch (e) {
      // sem clipe de IA: a cena entra no filme como imagem com movimento suave, e o vídeo não entregue é devolvido
      console.warn(`filme: cena ${cena.label} sem vídeo:`, (e as Error)?.message);
      clips.push(await imageToClip(img, env.clipSeconds));
      await refundPart(c, COSTS.filmeVideoPorCena, "Estorno: vídeo da cena que falhou");
      fallback++;
    }
  }
  if (!clips.length) throw new UserError("Não foi possível gerar nenhuma cena. Tente novamente.");
  if (skipped || fallback) c.gen.message = `Concluído. ${skipped ? `${skipped} cena(s) não puderam ser geradas. ` : ""}${fallback ? `${fallback} cena(s) usam imagem animada no lugar do vídeo de IA. ` : ""}Os créditos dessas partes foram devolvidos.`;
  progress(c, 93, "Montando o filme final com ffmpeg…");
  let final: Buffer;
  try {
    final = await concatClips(clips, env.clipSeconds);
  } catch (e) {
    // sem o MP4 final o usuário fica só com as imagens das cenas: devolve a parte de vídeo
    console.error("filme: montagem falhou:", (e as Error)?.message);
    await refundPart(c, clips.length * COSTS.filmeVideoPorCena - (c.gen.refunded || 0), "Estorno: filme não montado");
    c.gen.message = "Concluído. Não foi possível montar o filme; as imagens das cenas estão disponíveis e os créditos do vídeo foram devolvidos.";
    return;
  }
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
  const aspect = await nearestAspect(current.data, "16:9");
  let feitas = 0;
  for (let i = 0; i < n; i++) {
    progress(c, (i / n) * 95 + 3, `Editando a região ${i + 1} de ${n}…`);
    const mask = c.input.images[`mask${i + 1}`];
    c.gen.usage.images++;
    let out: Buffer;
    try {
      // ordem declarada no prompt: imagem 1 = imagem atual, imagem 2 = máscara
      if (mockGemini()) { await new Promise((r) => setTimeout(r, 900)); out = await mockEdit(current.data, mask.data, i); }
      else {
        out = await generateImage(composeEdit(regions[i].text), [current, mask], aspect);
        const fixed = await recompose(current, out, mask).catch((e) => { console.warn("recompose falhou:", e?.message || e); return null; });
        if (fixed) out = fixed; else semRecorte = true;
      }
    } catch (e) {
      // falha numa região: entrega o que já foi editado e devolve as regiões restantes
      if (!feitas) throw e;
      console.warn(`editor: região ${i + 1} falhou:`, (e as Error)?.message);
      c.gen.message = `Concluído. Só ${feitas} de ${n} regiões foram editadas; os créditos das demais foram devolvidos.`;
      await refundPart(c, (c.gen.cost / n) * (n - feitas), "Estorno: regiões que falharam");
      break;
    }
    current = asImg(out);
    feitas++;
  }
  if (semRecorte && feitas === n) c.gen.message = "Concluído. O formato da imagem devolvida difere do original: o recorte por máscara não pôde ser aplicado, confira as áreas fora da região.";
  await addOutput(c, current.data, ext(current.data), "image", feitas > 1 ? `Editada (${feitas} regiões)` : "Editada");
}

/** Gera cada ângulo em paralelo e, no modo mosaico, junta tudo em uma imagem. */
async function angulos(c: Ctx) {
  const list: { label: string; prompt: string }[] = c.input.params.angles;
  const n = list.length;
  c.gen.prompt = snap(c, `${list[0].prompt}\n\n(estrutura repetida para cada ângulo; ângulos:)\n${list.map((a) => a.label).join("\n")}`, { angulos: n });
  const got: { label: string; buf: Buffer }[] = [];
  const aspect = await nearestAspect(c.input.images.base.data, "16:9");
  let done = 0;
  const res = await Promise.allSettled(list.map((a, i) =>
    makeImage(c, `Ângulo ${i + 1}`, a.prompt, [c.input.images.base], aspect).then(async (b) => {
      got[i] = { label: a.label, buf: b };
      await addOutput(c, b, ext(b), "image", a.label);
      progress(c, (++done / n) * 90, `${done} de ${n} ângulos prontos`);
    })));
  const failed = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failed.length === n) throw failed[0].reason;
  if (failed.length) {
    c.gen.message = `${n - failed.length} de ${n} ângulos gerados (alguns falharam).`;
    await refundPart(c, (c.gen.cost / n) * failed.length, "Estorno: ângulos que falharam");
  }
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
