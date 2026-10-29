import { env } from "./config";
import { generateImage as geminiImage, generateVideo as geminiVideo, geminiText } from "./gemini";
import { grokImage, grokText, grokVideo } from "./grok";

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

/** Descrição em texto de uma imagem (bíblia visual do filme), no provedor escolhido para imagem. */
export function describeProject(prompt: string, images: Img[]): Promise<string> {
  return env.imageProvider === "grok" ? grokText(prompt, images) : geminiText(prompt, images);
}
