import { Agent, fetch as ufetch } from "undici";
import { env } from "./config";
import type { Img } from "./gemini";

/**
 * Provedor xAI (Grok Imagine). Ref.: docs.x.ai (Image Generation, Multi-Image Editing, Video Generation).
 * A documentação deixa alguns campos em aberto (nome do array de várias imagens, formato da resposta), então
 * as chamadas tentam variações e removem campos opcionais que a API recusar. O que funcionar fica no log.
 */
const BASE = "https://api.x.ai/v1";
const agent = new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 30_000 });

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; json: any; text: string }> {
  const res = await ufetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.xaiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    dispatcher: agent,
  } as any).catch((e: any) => { throw new Error(`Falha de rede ao chamar o xAI: ${e?.cause?.message || e?.message}`); });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
  return { status: res.status, json, text };
}

const dataUri = (i: Img) => `data:${i.mime};base64,${i.data.toString("base64")}`;
const fail = (what: string, r: { status: number; text: string }) => new Error(`xAI ${what} ${r.status}: ${r.text.slice(0, 400)}`);
const isFieldError = (r: { status: number }) => r.status === 400 || r.status === 422;

async function download(url: string): Promise<Buffer> {
  const res = await ufetch(url, { dispatcher: agent } as any);
  if (!res.ok) throw new Error(`Download do xAI falhou: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Edição de imagem: 1 a 5 imagens de entrada + prompt -> imagem. */
export async function grokImage(prompt: string, images: Img[], aspect?: string, size?: string): Promise<Buffer> {
  const ref = (i: Img) => ({ url: dataUri(i), type: "image_url" });
  const base: Record<string, unknown> = { model: env.grokImageModel, prompt };
  const shapes: Record<string, unknown>[] = images.length <= 1
    ? [{ ...base, image: ref(images[0]) }]
    : [{ ...base, images: images.slice(0, 5).map(ref) }, { ...base, image: images.slice(0, 5).map(ref) }];
  const optional: [string, unknown][] = [
    ["response_format", "b64_json"],
    ["resolution", (size || env.imageSize).toLowerCase()],
    ...(aspect ? ([["aspect_ratio", aspect]] as [string, unknown][]) : []),
  ];

  let last: { status: number; text: string } | null = null;
  for (const shape of shapes) {
    // tenta com todos os campos opcionais e vai removendo o último a cada recusa
    for (let keep = optional.length; keep >= 0; keep--) {
      const body = { ...shape, ...Object.fromEntries(optional.slice(0, keep)) };
      const r = await call("POST", "/images/edits", body);
      if (r.status >= 200 && r.status < 300) {
        const d = r.json?.data?.[0];
        if (d?.b64_json) return Buffer.from(d.b64_json, "base64");
        if (d?.url) return download(d.url);
        throw new Error(`xAI não devolveu imagem (resposta inesperada): ${r.text.slice(0, 300)}`);
      }
      last = r;
      if (!isFieldError(r)) throw fail("images/edits", r);
    }
  }
  throw fail("images/edits", last!);
}

/** Imagem -> vídeo. O xAI documenta a imagem por URL pública; sem URL, tenta a imagem em base64. */
export async function grokVideo(prompt: string, image: Img, publicUrl?: string | null): Promise<Buffer> {
  const body: Record<string, unknown> = {
    model: env.grokVideoModel, prompt, image: { url: publicUrl || dataUri(image) },
    duration: env.grokVideoSeconds, resolution: env.grokVideoRes,
  };
  let r = await call("POST", "/videos/generations", body);
  if (isFieldError(r) && /resolution/i.test(r.text)) { delete body.resolution; r = await call("POST", "/videos/generations", body); }
  if (r.status < 200 || r.status >= 300) throw fail("videos/generations", r);
  const id = r.json?.request_id;
  if (!id) throw new Error(`xAI não devolveu request_id: ${r.text.slice(0, 300)}`);

  for (let i = 0; i < 180; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    const p = await call("GET", `/videos/${id}`);
    if (p.status >= 400 && p.status !== 404) throw fail("videos/{id}", p);
    const st = p.json?.status;
    if (st === "failed" || st === "expired") throw new Error(`Geração de vídeo ${st} no xAI: ${p.text.slice(0, 300)}`);
    if (st === "done") {
      const url = p.json?.video?.url;
      if (!url) throw new Error(`xAI concluiu sem URL de vídeo: ${p.text.slice(0, 300)}`);
      return download(url);
    }
  }
  throw new Error("Tempo esgotado aguardando o vídeo do xAI (15 min).");
}
