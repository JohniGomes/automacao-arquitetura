import crypto from "node:crypto";
import type { User } from "./db";
import { UserError } from "./errors";
import { activePlan } from "./plans";
import { store } from "./store";
import { needsVerification } from "./verify";

/**
 * Código do VDO Club: quem tem o código ganha o plano Max por alguns dias e créditos grátis, uma vez por conta.
 * Tudo vem de variáveis do servidor (sem o VDO_CODE o recurso fica desligado):
 *   VDO_CODE      o código que você divulga (não diferencia maiúsculas)
 *   VDO_CREDITOS  créditos concedidos (padrão 300)
 *   VDO_DIAS      dias de plano Max (padrão 30)
 *   VDO_LIMITE    máximo de contas que podem usar o código (padrão 100)
 *   VDO_ATE       data limite para resgatar, ex.: 2026-12-31 (opcional)
 */
export const PROMO_REASON = "Créditos do VDO Club";
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export const promoCfg = () => ({
  code: (process.env.VDO_CODE || "").trim(),
  creditos: num(process.env.VDO_CREDITOS, 300),
  dias: num(process.env.VDO_DIAS, 30),
  limite: num(process.env.VDO_LIMITE, 100),
  ate: process.env.VDO_ATE ? new Date(process.env.VDO_ATE).getTime() + 86_400_000 - 1 : 0, // vale até o fim desse dia
});

export const promoAtivo = () => { const c = promoCfg(); return !!c.code && (!c.ate || Date.now() <= c.ate); };

export async function jaResgatou(userId: string) {
  return (await store.listTxs(userId, 5000)).some((t) => t.reason === PROMO_REASON);
}

const igual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function resgatarCodigo(u: User, codigo: string): Promise<{ creditos: number; ate: string }> {
  const c = promoCfg();
  if (!promoAtivo() || !igual(codigo.trim().toLowerCase(), c.code.toLowerCase())) throw new UserError("Código inválido ou encerrado.");
  if (needsVerification(u)) throw new UserError("Confirme seu e-mail antes de usar o código.");
  if (activePlan(u)) throw new UserError("Você já tem um plano ativo. O código vale para quem ainda não tem plano.");
  if (await jaResgatou(u.id)) throw new UserError("Este código já foi usado nesta conta.");
  if ((await store.countTxsByReason(PROMO_REASON)) >= c.limite) throw new UserError("As vagas deste código acabaram.");
  const ate = new Date(Date.now() + c.dias * 86_400_000).toISOString();
  // planStatus "cancelado": não há renovação (não existe assinatura) e a pessoa pode assinar um plano quando quiser
  await store.setPlan(u.id, { plan: "max", planUntil: ate, planStatus: "cancelado", planNext: null });
  await store.grant(u.id, c.creditos, PROMO_REASON);
  return { creditos: c.creditos, ate };
}
