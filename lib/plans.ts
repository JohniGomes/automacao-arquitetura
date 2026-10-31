import { PLANOS } from "./costs";
import type { User } from "./db";

export type PlanId = (typeof PLANOS)[number]["id"];
export type PlanRules = {
  /** projetos que a conta pode ter (Infinity = sem limite) */
  projetos: number;
  /** quantos dias de histórico de gerações aparecem (Infinity = tudo) */
  historicoDias: number;
  prioridade: boolean;
  render2k: boolean;
  /** downloads de imagem sem a marca d'água do ArqIA */
  semMarca: boolean;
  cenasFilme: number;
  suportePrioritario: boolean;
};

/** O que cada plano libera. Mantenha alinhado com a lista de benefícios em lib/costs.ts (PLANOS). */
export const RULES: Record<PlanId, PlanRules> = {
  essencial: { projetos: 3, historicoDias: 30, prioridade: false, render2k: false, semMarca: false, cenasFilme: 3, suportePrioritario: false },
  profissional: { projetos: Infinity, historicoDias: 365, prioridade: true, render2k: true, semMarca: true, cenasFilme: 3, suportePrioritario: false },
  max: { projetos: Infinity, historicoDias: Infinity, prioridade: true, render2k: true, semMarca: true, cenasFilme: 5, suportePrioritario: true },
};
/** conta sem plano ativo (cadastro gratuito ou só créditos avulsos) */
export const SEM_PLANO: PlanRules = { projetos: 3, historicoDias: 30, prioridade: false, render2k: false, semMarca: false, cenasFilme: 3, suportePrioritario: false };

export const planById = (id?: string) => PLANOS.find((p) => p.id === id) ?? null;

/** Plano vigente: existe e ainda não venceu (um plano cancelado vale até o fim do período pago). */
export function activePlan(u: Pick<User, "plan" | "planUntil">) {
  if (!u.plan || !u.planUntil || new Date(u.planUntil).getTime() < Date.now()) return null;
  return planById(u.plan);
}

export const rulesOf = (u: Pick<User, "plan" | "planUntil">): PlanRules => {
  const p = activePlan(u);
  return p ? RULES[p.id] : SEM_PLANO;
};
