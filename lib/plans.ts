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
  /** maior alcance do mapa de situação, em metros (600 ou 1000) */
  alcanceMapaM: number;
  /** lugares de referência na vista aérea */
  lugaresAerea: number;
  /** prancha do mapa de situação também em SVG vetorial */
  pranchaSvg: boolean;
  /** exportação do mapa de situação em DXF (AutoCAD) */
  pranchaDxf: boolean;
  /** gerações em andamento ao mesmo tempo */
  simultaneas: number;
  /** desconto, em %, na compra de créditos avulsos */
  descontoPacotes: number;
  /** marca do escritório na prancha: logo e nome (básica) ou também responsável técnico e cor (completa) */
  marcaEscritorio: "nenhuma" | "basica" | "completa";
  /** links públicos de apresentação ativos ao mesmo tempo (0 = não tem; Infinity = ilimitado) */
  linksApresentacao: number;
};

/** O que cada plano libera. Mantenha alinhado com a lista de benefícios em lib/costs.ts (PLANOS). */
export const RULES: Record<PlanId, PlanRules> = {
  essencial: { projetos: 3, historicoDias: 30, prioridade: false, render2k: false, semMarca: false, cenasFilme: 3, suportePrioritario: false, alcanceMapaM: 600, lugaresAerea: 5, pranchaSvg: false, pranchaDxf: false, simultaneas: 2, descontoPacotes: 0, marcaEscritorio: "nenhuma", linksApresentacao: 0 },
  profissional: { projetos: Infinity, historicoDias: 365, prioridade: true, render2k: true, semMarca: true, cenasFilme: 3, suportePrioritario: false, alcanceMapaM: 1000, lugaresAerea: 9, pranchaSvg: true, pranchaDxf: false, simultaneas: 3, descontoPacotes: 15, marcaEscritorio: "basica", linksApresentacao: 1 },
  max: { projetos: Infinity, historicoDias: Infinity, prioridade: true, render2k: true, semMarca: true, cenasFilme: 5, suportePrioritario: true, alcanceMapaM: 1000, lugaresAerea: 9, pranchaSvg: true, pranchaDxf: true, simultaneas: 5, descontoPacotes: 25, marcaEscritorio: "completa", linksApresentacao: Infinity },
};
/** conta sem plano ativo (cadastro gratuito ou só créditos avulsos) */
export const SEM_PLANO: PlanRules = { projetos: 3, historicoDias: 30, prioridade: false, render2k: false, semMarca: false, cenasFilme: 3, suportePrioritario: false, alcanceMapaM: 600, lugaresAerea: 5, pranchaSvg: false, pranchaDxf: false, simultaneas: 2, descontoPacotes: 0, marcaEscritorio: "nenhuma", linksApresentacao: 0 };

/** Menor preço possível de um pacote (o maior desconto de qualquer plano): o webhook nunca aceita um valor abaixo disso. */
export const FATOR_MINIMO_PACOTE = 1 - Math.max(...Object.values(RULES).map((r) => r.descontoPacotes)) / 100;
/** Preço do pacote para a conta: o do catálogo menos o desconto do plano ativo, em reais com centavos. */
export const precoPacote = (preco: number, u: Pick<User, "plan" | "planUntil">) => Math.round(preco * (1 - rulesOf(u).descontoPacotes / 100) * 100) / 100;

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
