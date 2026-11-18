import type { Coupon, Tx, User } from "./db";
import { UserError } from "./errors";
import { activePlan, planById } from "./plans";
import { PLANOS } from "./costs";
import { store } from "./store";
import { needsVerification } from "./verify";

/**
 * Teste grátis e cupons.
 *
 * - Quem chega sem cupom escolhe um plano, cadastra o cartão e ganha o teste grátis (TRIAL_DIAS dias e TRIAL_CREDITOS créditos):
 *   a cobrança só acontece no fim do teste, e quem cancela antes não paga nada.
 * - Cupom de desconto (% ou R$): abate todas as mensalidades da assinatura. Vale junto com o teste grátis.
 * - Cupom de acesso: libera X créditos por X dias. Pede o cartão e cobra ao fim do período, exceto quando o cupom é marcado
 *   "sem cartão" (só o VDO Club): aí o plano e os créditos entram na hora, sem assinatura, e quando o prazo acaba é preciso assinar.
 * Quando o período acaba, os créditos do cupom/teste que sobraram expiram. Os cupons são criados no painel de administração.
 */
export const TRIAL = {
  dias: Number(process.env.TRIAL_DIAS) > 0 ? Number(process.env.TRIAL_DIAS) : 3,
  creditos: process.env.TRIAL_CREDITOS !== undefined && process.env.TRIAL_CREDITOS !== "" && Number(process.env.TRIAL_CREDITOS) >= 0 ? Number(process.env.TRIAL_CREDITOS) : 100,
};
export const MOTIVO_TESTE = "Teste grátis: créditos";
const PREFIXO = "Cupom ";
export const motivoCupom = (code: string) => `${PREFIXO}${code.toUpperCase()}: créditos`;
const RE_CUPOM = /^Cupom .*: créditos$/;
const RE_CONCESSAO = /^(Cupom .*: créditos|Teste grátis: créditos)$/;
export const motivoDesconto = (code: string) => `${PREFIXO}${code.toUpperCase()}: desconto aplicado`;
const RE_DESCONTO = /^Cupom .*: desconto aplicado$/;
/** menor valor que o cartão aceita no Asaas */
export const MIN_COBRANCA = 5;
export const MOTIVO_EXPIRADO = "Créditos do cupom expirados";

export const normalizar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

export const usosDoCupom = (c: Coupon) => store.countTxsByReason(c.tipo === "acesso" ? motivoCupom(c.code) : motivoDesconto(c.code));

/** O cupom pode ser resgatado agora? (ativo, dentro da data e com vagas) */
export async function cupomDisponivel(c: Coupon | null): Promise<{ ok: true; usos: number } | { ok: false; motivo: string }> {
  if (!c || !c.ativo) return { ok: false, motivo: "Cupom inválido ou encerrado." };
  if (c.validoAte && Date.now() > new Date(c.validoAte).getTime()) return { ok: false, motivo: "Cupom inválido ou encerrado." };
  const usos = await usosDoCupom(c);
  if (c.limite != null && usos >= c.limite) return { ok: false, motivo: "As vagas deste cupom acabaram." };
  return { ok: true, usos };
}

/** Preço mensal com o cupom de desconto. Nunca abaixo do mínimo do cartão. */
export function precoComCupom(c: Coupon, preco: number): number {
  const bruto = c.tipo === "percentual" ? preco * (1 - c.desconto / 100) : preco - c.desconto;
  return Math.min(preco, Math.max(MIN_COBRANCA, Math.round(bruto * 100) / 100));
}

export type Teste = { dias: number; creditos: number; motivo: string };

/** Quem nunca teve plano, teste nem cupom de acesso pode fazer o teste grátis (uma vez por conta). */
export async function elegivelTeste(u: User): Promise<boolean> {
  if (u.plan || u.asaasSubscriptionId) return false;
  return !(await store.listTxs(u.id, 5000)).some((t) => RE_CONCESSAO.test(t.reason));
}
export async function testePadrao(u: User): Promise<Teste | null> {
  return (await elegivelTeste(u)) ? { dias: TRIAL.dias, creditos: TRIAL.creditos, motivo: MOTIVO_TESTE } : null;
}

/** Está no teste grátis ou no período de um cupom de acesso (assinatura criada, mas ainda sem nenhum pagamento de plano)? */
export async function emTeste(u: User): Promise<boolean> {
  const txs = await store.listTxs(u.id, 5000);
  return txs.some((t) => RE_CONCESSAO.test(t.reason)) && !txs.some((t) => /^Plano .*: créditos do mês$/.test(t.reason));
}

export type CupomPlano = { coupon: Coupon | null; preco: number; precoFinal: number; teste: Teste | null };

/**
 * O que a pessoa recebe ao assinar `planId`, com ou sem cupom: preço mensal e o período grátis (créditos e dias). Lança UserError
 * quando o cupom não pode ser usado.
 */
export async function condicoesDoPlano(u: User, planId: string, codigo = ""): Promise<CupomPlano> {
  const plano = PLANOS.find((p) => p.id === planId);
  if (!plano) throw new UserError("Item inválido.");
  const padrao = await testePadrao(u);
  if (!codigo.trim()) return { coupon: null, preco: plano.preco, precoFinal: plano.preco, teste: padrao };
  const c = await store.getCoupon(normalizar(codigo).slice(0, 60)).catch(() => null);
  const d = await cupomDisponivel(c);
  if (!d.ok || !c) throw new UserError(d.ok ? "Cupom inválido ou encerrado." : d.motivo);
  const txs = await store.listTxs(u.id, 5000);
  if (c.tipo === "acesso") {
    if (c.semCartao) throw new UserError("Este cupom libera acesso sem cobrança. Use-o em Créditos e planos, no campo Cupom de desconto.");
    if (!(await elegivelTeste(u))) throw new UserError("O período grátis deste cupom vale só para quem ainda não testou o Croqui.");
    return { coupon: c, preco: plano.preco, precoFinal: plano.preco, teste: { dias: c.dias, creditos: c.creditos, motivo: motivoCupom(c.code) } };
  }
  if (txs.some((t) => RE_DESCONTO.test(t.reason))) throw new UserError("Você já usou um cupom de desconto nesta conta.");
  const precoFinal = precoComCupom(c, plano.preco);
  if (precoFinal >= plano.preco) throw new UserError("Este cupom não reduz o valor deste plano.");
  return { coupon: c, preco: plano.preco, precoFinal, teste: padrao };
}

export async function jaUsouCupom(userId: string) {
  return (await store.listTxs(userId, 5000)).some((t) => RE_CUPOM.test(t.reason));
}

/**
 * Aplica o cupom a uma conta sem passar pelo pagamento: só o cupom de acesso "sem cartão" (VDO Club). Os demais cupons só são
 * validados aqui e valem na hora de assinar (condicoesDoPlano). `ignorarEmail` é só para o cadastro (a conta acabou de nascer).
 */
export async function resgatarCupom(u: User, codigo: string, opts: { ignorarEmail?: boolean } = {}): Promise<{ creditos: number; ate: string; plano: string; desconto?: boolean }> {
  const c = await store.getCoupon(normalizar(codigo).slice(0, 60)).catch(() => null);
  const d = await cupomDisponivel(c);
  if (!d.ok || !c) throw new UserError(d.ok ? "Cupom inválido ou encerrado." : d.motivo);
  if (c.tipo !== "acesso" || !c.semCartao) return { creditos: 0, ate: "", plano: "", desconto: true };
  if (!opts.ignorarEmail && needsVerification(u)) throw new UserError("Confirme seu e-mail antes de usar o cupom.");
  if (activePlan(u)) throw new UserError("Você já tem um plano ativo. O cupom vale para quem ainda não tem plano.");
  if (await jaUsouCupom(u.id)) throw new UserError("Você já usou um cupom nesta conta.");
  const plano = planById(c.plano)?.id ?? "max";
  const ate = new Date(Date.now() + c.dias * 86_400_000).toISOString();
  // planStatus "cancelado": não há renovação (não existe assinatura) e, quando o prazo acaba, a pessoa precisa assinar
  await store.setPlan(u.id, { plan: plano, planUntil: ate, planStatus: "cancelado", planNext: null });
  if (c.creditos > 0) await store.grant(u.id, c.creditos, motivoCupom(c.code));
  return { creditos: c.creditos, ate, plano };
}

/**
 * Créditos do teste/cupom que ainda não foram gastos. O consumo usa primeiro o que foi concedido mais cedo, então a sobra é
 * concedido − gasto desde então (gerações menos estornos), limitada ao saldo. Mesma lógica de lib/planCredits.ts.
 */
export function sobraDoCupom(txs: Tx[], saldo: number): number {
  const asc = [...txs].sort((a, b) => a.at.localeCompare(b.at));
  let i = -1;
  for (let k = asc.length - 1; k >= 0; k--) if (RE_CONCESSAO.test(asc[k].reason)) { i = k; break; }
  if (i < 0) return 0;
  let gasto = 0;
  for (const t of asc.slice(i + 1)) {
    if (t.delta < 0) { if (t.reason !== MOTIVO_EXPIRADO && !/^Estorno de pagamento/.test(t.reason)) gasto += -t.delta; }
    else if (/^Estorno/.test(t.reason)) gasto -= t.delta;
  }
  return Math.max(0, Math.min(saldo, asc[i].delta - Math.max(0, gasto)));
}

/** Expira os créditos do teste/cupom que sobraram (se houver). Devolve quantos créditos expiraram. */
export async function expirarSobraDoTeste(userId: string): Promise<number> {
  const u = await store.getUser(userId);
  if (!u) return 0;
  const sobra = sobraDoCupom(await store.listTxs(userId, 5000), u.credits);
  if (sobra > 0) await store.charge(userId, sobra, MOTIVO_EXPIRADO);
  return sobra;
}

/**
 * Período vencido (cupom sem cartão, teste que não virou assinatura paga ou assinatura cancelada): expira a sobra dos créditos
 * do teste/cupom e tira o plano. Roda quando a pessoa usa o app; depois disso o plano fica vazio e a verificação não repete.
 * Assinatura paga que só atrasou continua válida: o pagamento seguinte devolve o plano pelo webhook.
 */
export async function expirarCupomSeVencido(u: User): Promise<User> {
  if (!u.plan || !u.planUntil || new Date(u.planUntil).getTime() > Date.now()) return u;
  await expirarSobraDoTeste(u.id);
  await store.setPlan(u.id, { plan: null, planUntil: null, planStatus: null, planNext: null });
  return (await store.getUser(u.id)) ?? u;
}
