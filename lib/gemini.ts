import { Agent, fetch as ufetch } from "undici";
import { env } from "./config";
import { UserError } from "./errors";

// Gerar vídeo pode levar minutos com a conexão aberta; o limite de tempo de cada chamada é o AbortSignal abaixo.
const longAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 30_000 });

const BASE = "https://generativelanguage.googleapis.com/v1beta";
export type Img = { data: Buffer; mime: string };

const IMAGE_TIMEOUT = 5 * 60_000;
const VIDEO_TIMEOUT = 15 * 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST com tempo limite e até 2 novas tentativas em erro temporário (429, 5xx ou rede). Os erros 4xx não repetem. */
async function post(body: unknown, timeoutMs = IMAGE_TIMEOUT) {
  let last: Error = new Error("Falha ao chamar o Gemini.");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(attempt === 1 ? 2_000 : 6_000);
    let res;
    try {
      res = await ufetch(`${BASE}/interactions`, {
        method: "POST",
        headers: { "x-goog-api-key": env.geminiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        dispatcher: longAgent,
        signal: AbortSignal.timeout(timeoutMs),
      } as any);
    } catch (e: any) {
      last = new Error(`Falha de rede ao chamar o Gemini: ${e?.cause?.message || e?.message}`);
      if (e?.name === "TimeoutError") throw new UserError("A IA demorou demais para responder. Tente novamente.");
      continue;
    }
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    last = new Error(`Gemini API ${res.status}: ${text.slice(0, 400)}`);
    if (res.status !== 429 && res.status < 500) throw last;
  }
  throw last;
}

/** Procura recursivamente o primeiro bloco de mídia do tipo pedido (formato da resposta varia entre SDK e REST). */
function findMedia(node: any, type: "image" | "video"): any | null {
  if (!node || typeof node !== "object") return null;
  if (node.type === type && (node.data || node.uri)) return node;
  if (node[`output_${type}`]) return node[`output_${type}`];
  for (const k of Object.keys(node)) {
    const r = findMedia(node[k], type);
    if (r) return r;
  }
  return null;
}

/** Procura sinais de bloqueio por segurança na resposta (o nome do campo varia). */
const blocked = (json: unknown) => /SAFETY|PROHIBITED|BLOCKED|blockReason|IMAGE_OTHER|RECITATION/i.test(JSON.stringify(json).slice(0, 20_000));
const BLOCK_MSG = "A IA recusou esta imagem por segurança. Reformule o pedido ou use outra imagem.";

/** Imagem(ns) de entrada + prompt -> imagem. Ref.: ai.google.dev/gemini-api/docs/image-generation */
export async function generateImage(prompt: string, images: Img[], aspect?: string, size?: string): Promise<Buffer> {
  const input = [
    { type: "text", text: prompt },
    ...images.map((i) => ({ type: "image", mime_type: i.mime, data: i.data.toString("base64") })),
  ];
  const response_format: Record<string, string> = { type: "image", mime_type: "image/jpeg", image_size: size || env.imageSize };
  if (aspect) response_format.aspect_ratio = aspect;
  const json = await post({ model: env.imageModel, input, response_format });
  const m = findMedia(json, "image");
  if (!m?.data) throw new UserError(blocked(json) ? BLOCK_MSG : "A IA não devolveu a imagem. Tente novamente.");
  return Buffer.from(m.data, "base64");
}

/** Imagem + prompt -> vídeo 16:9 (720p nativo; 1080p do Omni é upscale, o filme final é montado em 1920x1080 pelo ffmpeg). Ref.: ai.google.dev/gemini-api/docs/omni */
export async function generateVideo(prompt: string, image: Img): Promise<Buffer> {
  const json = await post({
    model: env.videoModel,
    input: [
      { type: "image", data: image.data.toString("base64"), mime_type: image.mime },
      // o Omni não tem parâmetro de duração: ela é pedida no texto
      { type: "text", text: `${prompt}\nTotal clip length: ${env.videoSeconds} seconds.` },
    ],
    generation_config: { video_config: { task: "image_to_video" } },
    response_format: { type: "video", aspect_ratio: "16:9", resolution: env.videoRes, delivery: "uri" },
  }, VIDEO_TIMEOUT);
  const m = findMedia(json, "video");
  if (!m) throw new UserError(blocked(json) ? BLOCK_MSG : "A IA não devolveu o vídeo. Tente novamente.");
  if (m.data) return Buffer.from(m.data, "base64");
  const id = String(m.uri).match(/files\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) throw new Error("URI de vídeo inesperada: " + m.uri);
  const headers = { "x-goog-api-key": env.geminiKey };
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    const r = await ufetch(`${BASE}/files/${id}`, { headers, dispatcher: longAgent, signal: AbortSignal.timeout(60_000) } as any);
    if (!r.ok) throw new Error(`Consulta do vídeo falhou: ${r.status}`);
    const f: any = await r.json();
    if (f.state === "ACTIVE") ready = true;
    else if (f.state === "FAILED") throw new Error("Geração de vídeo falhou no Gemini.");
    else await sleep(5000);
  }
  if (!ready) throw new UserError("O vídeo demorou demais para ficar pronto. Tente novamente.");
  const dl = await ufetch(`${BASE}/files/${id}:download?alt=media`, { headers, redirect: "follow", dispatcher: longAgent, signal: AbortSignal.timeout(5 * 60_000) } as any);
  if (!dl.ok) throw new Error(`Download do vídeo falhou: ${dl.status}`);
  return Buffer.from(await dl.arrayBuffer());
}

function findText(n: any): string | null {
  if (!n || typeof n !== "object") return null;
  if (typeof n.output_text === "string" && n.output_text.trim()) return n.output_text;
  if (n.type === "text" && typeof n.text === "string" && n.text.trim()) return n.text;
  for (const k of Object.keys(n)) { const r = findText(n[k]); if (r) return r; }
  return null;
}

/** Texto a partir de prompt + imagens (usado na "bíblia visual" do filme). Modelo: GEMINI_TEXT_MODEL. */
export async function geminiText(prompt: string, images: Img[]): Promise<string> {
  const input = [
    { type: "text", text: prompt },
    ...images.map((i) => ({ type: "image", mime_type: i.mime, data: i.data.toString("base64") })),
  ];
  const json = await post({ model: env.geminiTextModel, input }, 2 * 60_000);
  const out = (Array.isArray(json?.steps) ? json.steps.filter((s: any) => s?.type === "model_output") : []).map(findText).filter(Boolean).join("\n") || findText(json);
  if (!out) throw new Error("Gemini não devolveu texto.");
  return out.trim();
}
