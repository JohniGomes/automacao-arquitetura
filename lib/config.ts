export const env = {
  geminiKey: process.env.GEMINI_API_KEY || "",
  mapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
  imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1",
  videoModel: process.env.GEMINI_VIDEO_MODEL || "gemini-omni-1.1-flash",
  /** Omni: resolução (360p, 720p, 1080p/4k são upscale) e duração pedida no prompt; custo medido: ~29 mil tokens de vídeo por clipe de 5 s em 720p */
  videoRes: process.env.GEMINI_VIDEO_RES || "720p",
  videoSeconds: Number(process.env.GEMINI_VIDEO_SECONDS || 5),
  imageSize: process.env.GEMINI_IMAGE_SIZE || "1K",
  /** modelo de texto com visão (bíblia visual do filme); os nomes mudam, confira na documentação do Google */
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash",

  signupCredits: Number(process.env.SIGNUP_CREDITS || 0), // contas novas não ganham créditos soltos: o teste grátis vem ao escolher o plano
  appUrl: process.env.APP_URL || "http://localhost:3000",
  /** em produção o app não sobe sem SESSION_SECRET: um segredo conhecido permitiria forjar sessões */
  get sessionSecret(): string {
    const s = process.env.SESSION_SECRET;
    if (s) return s;
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não definido.");
    return "dev-insecure-secret-change-me";
  },
  /** e-mail do suporte: cada mensagem enviada em /suporte também chega aqui (quando o envio estiver configurado) */
  supportEmail: process.env.SUPPORT_EMAIL || "",
  /** WhatsApp do suporte prioritário (plano Max), só dígitos com DDI e DDD */
  supportWhatsapp: (process.env.SUPPORT_WHATSAPP || "5562981834833").replace(/\D/g, ""),
};

const flag = () => (process.env.MOCK_MODE || "auto").toLowerCase();
/** mock da IA de imagem (sem a chave do Gemini) */
export const mockGemini = () => flag() === "true" || (flag() === "auto" && !env.geminiKey);
/** mock da IA de vídeo */
export const mockVideo = () => mockGemini();
/** mock do Google Maps */
export const mockMaps = () => flag() === "true" || (flag() === "auto" && !env.mapsKey);
