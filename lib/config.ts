export const env = {
  geminiKey: process.env.GEMINI_API_KEY || "",
  mapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
  imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1",
  videoModel: process.env.GEMINI_VIDEO_MODEL || "gemini-omni-1.1-flash",
  imageSize: process.env.GEMINI_IMAGE_SIZE || "1K",
  clipSeconds: Number(process.env.CLIP_SECONDS || 0) /* 0 = mantém o clipe inteiro do Gemini, sem corte */,
  signupCredits: Number(process.env.SIGNUP_CREDITS || 100),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
};

const flag = () => (process.env.MOCK_MODE || "auto").toLowerCase();
/** mock da IA (Gemini) */
export const mockGemini = () => flag() === "true" || (flag() === "auto" && !env.geminiKey);
/** mock do Google Maps */
export const mockMaps = () => flag() === "true" || (flag() === "auto" && !env.mapsKey);
