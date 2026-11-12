import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Limitador de tentativas. Com Supabase configurado, a contagem fica no banco (função rate_hit, ver
 * supabase/migracao-limites.sql) e vale para todas as instâncias; se o SQL ainda não foi executado ou o banco falhar,
 * cai para a contagem em memória do processo, para nunca derrubar o login/pagamento por causa do limitador.
 */
const g = globalThis as unknown as { __rl?: Map<string, number[]>; __rlsb?: SupabaseClient; __rlOff?: number };
const buckets = (g.__rl ??= new Map<string, number[]>());

function memory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) { buckets.set(key, hits); return true; }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return false;
}

const sharedOn = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY && !(g.__rlOff && Date.now() < g.__rlOff);

/** true se a chave passou de `max` ocorrências dentro da janela (e não conta a tentativa bloqueada). */
export async function limited(key: string, max: number, windowMs: number): Promise<boolean> {
  if (sharedOn()) {
    try {
      const sb = (g.__rlsb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
      const { data, error } = await sb.rpc("rate_hit", { p_key: key, p_max: max, p_window_ms: windowMs });
      if (error) throw new Error(error.message);
      return data === true;
    } catch (e: any) {
      // função ausente ou banco fora: usa a memória e só tenta o banco de novo em 2 minutos
      g.__rlOff = Date.now() + 120_000;
      console.warn("limite compartilhado indisponível, usando memória:", String(e?.message || e).slice(0, 120));
    }
  }
  return memory(key, max, windowMs);
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
