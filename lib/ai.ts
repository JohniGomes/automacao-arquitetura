import { env } from "./config";
import { generateImage as geminiImage, generateVideo as geminiVideo } from "./gemini";
import { grokImage, grokVideo } from "./grok";

export type { Img } from "./gemini";
import type { Img } from "./gemini";

/** Imagem(ns) de entrada + prompt -> imagem, no provedor escolhido (IMAGE_PROVIDER / AI_PROVIDER). */
export function generateImage(prompt: string, images: Img[], aspect?: string, size?: string): Promise<Buffer> {
  return env.imageProvider === "grok" ? grokImage(prompt, images, aspect, size) : geminiImage(prompt, images, aspect, size);
}

/** Imagem -> vídeo no provedor escolhido. `publicUrl` (link assinado do Storage) é usado pelo xAI quando existir. */
export function generateVideo(prompt: string, image: Img, publicUrl?: string | null): Promise<Buffer> {
  return env.videoProvider === "grok" ? grokVideo(prompt, image, publicUrl) : geminiVideo(prompt, image);
}
