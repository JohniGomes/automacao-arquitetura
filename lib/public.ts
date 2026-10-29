import type { Generation } from "./db";

/** Geração como o usuário pode ver: sem o prompt, que fica só no servidor. */
export const pub = (g: Generation): Omit<Generation, "prompt"> => { const { prompt: _p, ...rest } = g; return rest; };
