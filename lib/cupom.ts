import type { Coupon, Tx, User } from "./db";
import { UserError } from "./errors";
import { activePlan, planById } from "./plans";
import { store } from "./store";
import { needsVerification } from "./verify";

/**
 * Cupom de desconto: a pessoa digita o código (no cadastro ou em Créditos) e ganha o plano do cupom (normalmente o Max) e os créditos por
 * alguns dias. Quando o prazo acaba, o plano some e os créditos do cupom que sobraram expiram: para continuar, só assinando.
 * Os cupons são criados no painel de administração.
 */
const PREFIXO = "Cupom ";
export const motivoCupom = (code: string) => `${PREFIXO}${code.toUpperCase()}: créditos`;
const RE_CUPOM = /^Cupom .*: créditos$/;
export const MOTIVO_EXPIRADO = "Créditos do cupom expirados";

export const normalizar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

/** O cupom pode ser resgatado agora? (ativo, dentro da data e com vagas) */
export async function cupomDisponivel(c: Coupon | null): Promise<{ ok: true; usos: number } | { ok: false; motivo: string }> {
  if (!c || !c.ativo) return { ok: false, motivo: "Cupom inválido ou encerrado." };
  if (c.validoAte && Date.now() > new Date(c.validoAte).getTime()) return { ok: false, motivo: "Cupom inválido ou encerrado." };
  const usos = await store.countTxsByReason(motivoCupom(c.code));
  if (c.limite != null && usos >= c.limite) return { ok: false, motivo: "As vagas deste cupom acabaram." };
  return { ok: true, usos };
}

export async function jaUsouCupom(userId: string) {
  return (await store.listTxs(userId, 5000)).some((t) => RE_CUPOM.test(t.reason));
}

/** Aplica o cupom a uma conta. `ignorarEmail` é só para o cadastro (a conta acabou de nascer e ainda não confirmou o e-mail). */
export async function resgatarCupom(u: User, codigo: string, opts: { ignorarEmail?: boolean } = {}): Promise<{ creditos: number; ate: string; plano: string }> {
  const c = await store.getCoupon(normalizar(codigo).slice(0, 60)).catch(() => null);
  const d = await cupomDisponivel(c);
  if (!d.ok || !c) throw new UserError(d.ok ? "Cupom inválido ou encerrado." : d.motivo);
  if (!opts.ignorarEmail && needsVerification(u)) throw new UserError("Confirme seu e-mail antes de usar o cupom.");
  if (activePlan(u)) throw new UserError("Você já tem um plano ativo. O cupom vale para quem ainda não tem plano.");
  if (await jaUsouCupom(u.id)) throw new UserError("Você já usou um cupom nesta conta.");
  const plano = planById(c.plano)?.id ?? "max";
  const ate = new Date(Date.now() + c.dias * 86_400_000).toISOString();
  // planStatus "cancelado": não há renovação (não existe assinatura) e a pessoa assina quando quiser
  await store.setPlan(u.id, { plan: plano, planUntil: ate, planStatus: "cancelado", planNext: null });
  if (c.creditos > 0) await store.grant(u.id, c.creditos, motivoCupom(c.code));
  return { creditos: c.creditos, ate, plano };
}

/**
 * Créditos do cupom que ainda não foram gastos. O consumo usa primeiro o que foi concedido mais cedo, então a sobra é
 * concedido − gasto desde então (gerações menos estornos), limitada ao saldo. Mesma lógica de lib/planCredits.ts.
 */
export function sobraDoCupom(txs: Tx[], saldo: number): number {
  const asc = [...txs].sort((a, b) => a.at.localeCompare(b.at));
  let i = -1;
  for (let k = asc.length - 1; k >= 0; k--) if (RE_CUPOM.test(asc[k].reason)) { i = k; break; }
  if (i < 0) return 0;
  let gasto = 0;
  for (const t of asc.slice(i + 1)) {
    if (t.delta < 0) { if (t.reason !== MOTIVO_EXPIRADO && !/^Estorno de pagamento/.test(t.reason)) gasto += -t.delta; }
    else if (/^Estorno/.test(t.reason)) gasto -= t.delta;
  }
  return Math.max(0, Math.min(saldo, asc[i].delta - Math.max(0, gasto)));
}

/**
 * Plano de cupom vencido (plano sem assinatura e com a data passada): zera a sobra dos créditos do cupom e tira o plano.
 * Roda quando a pessoa usa o app; depois disso o plano fica vazio e a verificação não repete.
 */
export async function expirarCupomSeVencido(u: User): Promise<User> {
  if (!u.plan || u.asaasSubscriptionId || !u.planUntil || new Date(u.planUntil).getTime() > Date.now()) return u;
  const txs = await store.listTxs(u.id, 5000);
  const sobra = sobraDoCupom(txs, u.credits);
  if (sobra > 0) await store.charge(u.id, sobra, MOTIVO_EXPIRADO);
  await store.setPlan(u.id, { plan: null, planUntil: null, planStatus: null, planNext: null });
  return (await store.getUser(u.id)) ?? u;
}
