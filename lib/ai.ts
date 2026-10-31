import { generateImage, generateVideo, geminiText } from "./gemini";

export type { Img } from "./gemini";
export { generateImage, generateVideo };

/** Descrição em texto de uma imagem (bíblia visual do filme). */
export const describeProject = geminiText;
