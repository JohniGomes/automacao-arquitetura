import { store } from "./store";
import { enviarAviso, pushAtivo } from "./push";
import { limited } from "./ratelimit";
import { planById } from "./plans";
import { limiteBaixo, MIN_ACAO } from "./saldo";

export { COSTS } from "./costs";

/** Débito atômico (no Supabase, função SQL). Retorna false se o saldo não cobre. */
/**
 * Débito atômico (no Supabase, função SQL). Retorna false se o saldo não cobre. Quando o débito faz o saldo cruzar a linha de
 * "acabando" ou de "acabou", avisa a pessoa por push (se ela ativou os avisos), no máximo uma vez a cada 12 h por nível.
 */
export async function charge(userId: string, amount: number, reason: string, genId?: string) {
  const ok = await store.charge(userId, amount, reason, genId);
  if (ok && amount > 0 && pushAtivo()) void avisarSaldo(userId, amount);
  return ok;
}

async function avisarSaldo(userId: string, gasto: number) {
  try {
    const u = await store.getUser(userId);
    if (!u) return;
    const depois = u.credits, antes = depois + gasto;
    const limite = limiteBaixo(planById(u.plan ?? "")?.creditosMes);
    const nivel = depois < MIN_ACAO && antes >= MIN_ACAO ? "acabou" : depois <= limite && antes > limite ? "baixo" : null;
    if (!nivel) return;
    if (await limited(`saldo:${nivel}:${userId}`, 1, 12 * 3600_000)) return; // já avisou há pouco
    await enviarAviso(userId, nivel === "acabou"
      ? { titulo: "Seus créditos acabaram", texto: "Compre créditos ou escolha um plano para continuar gerando.", url: "/app/creditos", tag: "saldo" }
      : { titulo: "Seus créditos estão acabando", texto: `Restam ${depois} créditos. Garanta mais antes de acabar.`, url: "/app/creditos", tag: "saldo" });
  } catch (e) { console.error("aviso de saldo:", (e as Error)?.message); }
}
export async function refund(userId: string, amount: number, reason: string, genId?: string) {
  if (amount > 0) await store.grant(userId, amount, reason, genId);
}
