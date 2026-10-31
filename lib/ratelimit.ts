/** Limitador simples em memória (por processo). Em mais de uma instância, trocar por Redis/Upstash ou tabela no Supabase. */
const g = globalThis as unknown as { __rl?: Map<string, number[]> };
const buckets = (g.__rl ??= new Map<string, number[]>());

/** true se a chave passou de `max` ocorrências dentro da janela (e não conta a tentativa bloqueada). */
export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) { buckets.set(key, hits); return true; }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return false;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
