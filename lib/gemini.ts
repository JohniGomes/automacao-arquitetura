import { Agent, fetch as ufetch } from "undici";
import { env } from "./config";

// Gerar vídeo pode levar minutos com a conexão aberta: sem isso o fetch do Node desiste em ~5 min.
const longAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 30_000 });

const BASE = "https://generativelanguage.googleapis.com/v1beta";
export type Img = { data: Buffer; mime: string };

async function post(body: unknown) {
  const res = await ufetch(`${BASE}/interactions`, {
    method: "POST",
    headers: { "x-goog-api-key": env.geminiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    dispatcher: longAgent,
  } as any).catch((e: any) => { throw new Error(`Falha de rede ao chamar o Gemini: ${e?.cause?.message || e?.message}`); });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
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
  if (!m?.data) throw new Error("Gemini não devolveu imagem (resposta inesperada ou bloqueada por segurança).");
  return Buffer.from(m.data, "base64");
}

/** Imagem + prompt -> vídeo 16:9 1080p. Ref.: ai.google.dev/gemini-api/docs/omni */
export async function generateVideo(prompt: string, image: Img): Promise<Buffer> {
  const json = await post({
    model: env.videoModel,
    input: [
      { type: "image", data: image.data.toString("base64"), mime_type: image.mime },
      { type: "text", text: prompt },
    ],
    generation_config: { video_config: { task: "image_to_video" } },
    response_format: { type: "video", aspect_ratio: "16:9", resolution: "1080p", delivery: "uri" },
  });
  const m = findMedia(json, "video");
  if (!m) throw new Error("Gemini não devolveu vídeo.");
  if (m.data) return Buffer.from(m.data, "base64");
  const id = String(m.uri).match(/files\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) throw new Error("URI de vídeo inesperada: " + m.uri);
  for (let i = 0; i < 120; i++) {
    const f: any = await (await ufetch(`${BASE}/files/${id}`, { headers: { "x-goog-api-key": env.geminiKey }, dispatcher: longAgent })).json();
    if (f.state === "ACTIVE") break;
    if (f.state === "FAILED") throw new Error("Geração de vídeo falhou no Gemini.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const dl = await ufetch(`${BASE}/files/${id}:download?alt=media`, { headers: { "x-goog-api-key": env.geminiKey }, redirect: "follow", dispatcher: longAgent });
  if (!dl.ok) throw new Error(`Download do vídeo falhou: ${dl.status}`);
  return Buffer.from(await dl.arrayBuffer());
}
