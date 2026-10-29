const provider = (v: string | undefined, fallback: string) => ((v || fallback).toLowerCase() === "grok" ? "grok" : "gemini") as "gemini" | "grok";
const AI = process.env.AI_PROVIDER || "gemini";

export const env = {
  geminiKey: process.env.GEMINI_API_KEY || "",
  xaiKey: process.env.XAI_API_KEY || "",
  mapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
  /** provedor de imagem e de vídeo: AI_PROVIDER define os dois; IMAGE_PROVIDER / VIDEO_PROVIDER sobrescrevem cada um */
  imageProvider: provider(process.env.IMAGE_PROVIDER, AI),
  videoProvider: provider(process.env.VIDEO_PROVIDER, AI),
  imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1",
  videoModel: process.env.GEMINI_VIDEO_MODEL || "gemini-omni-1.1-flash",
  imageSize: process.env.GEMINI_IMAGE_SIZE || "1K",
  /** modelos de texto com visão (bíblia visual do filme); os nomes podem mudar, confira na documentação do provedor */
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash",
  grokTextModel: process.env.GROK_TEXT_MODEL || "grok-4",
  grokImageModel: process.env.GROK_IMAGE_MODEL || "grok-imagine-image-2.0",
  grokVideoModel: process.env.GROK_VIDEO_MODEL || "grok-imagine-video-1.5",
  /** duração e resolução pedidas ao Grok (a duração aceita é de 1 a 15 s; 480p, 720p ou 1080p) */
  grokVideoSeconds: Number(process.env.GROK_VIDEO_SECONDS || 5),
  grokVideoRes: process.env.GROK_VIDEO_RES || "720p",
  clipSeconds: Number(process.env.CLIP_SECONDS || 0) /* 0 = mantém o clipe inteiro devolvido pela IA, sem corte */,
  signupCredits: Number(process.env.SIGNUP_CREDITS || 100),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
};

const flag = () => (process.env.MOCK_MODE || "auto").toLowerCase();
const hasKey = (p: "gemini" | "grok") => (p === "grok" ? !!env.xaiKey : !!env.geminiKey);
/** mock da IA de imagem (sem a chave do provedor escolhido) */
export const mockGemini = () => flag() === "true" || (flag() === "auto" && !hasKey(env.imageProvider));
/** mock da IA de vídeo */
export const mockVideo = () => flag() === "true" || (flag() === "auto" && !hasKey(env.videoProvider));
/** mock do Google Maps */
export const mockMaps = () => flag() === "true" || (flag() === "auto" && !env.mapsKey);
/** nome da variável de chave que falta, para mensagens */
export const keyName = (p: "gemini" | "grok") => (p === "grok" ? "XAI_API_KEY" : "GEMINI_API_KEY");
