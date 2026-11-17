import type { Tx } from "./db";

/**
 * Créditos do plano não acumulam: na renovação, o que sobrou do mês anterior expira e entra o pacote do mês.
 * Como o saldo é um número só (créditos do plano + créditos avulsos comprados), a sobra do plano sai do extrato: o consumo
 * usa primeiro o que foi concedido mais cedo (fila), então do pacote do mês anterior sobra
 *   concedido (pacote do mês + créditos proporcionais de troca de plano) − gasto desde então (gerações menos estornos),
 * limitado ao saldo atual. Créditos avulsos comprados e de boas-vindas nunca expiram.
 */
const RE_PACOTE_MES = /^Plano .*: créditos do mês$/;
const RE_TROCA = /^Troca para o plano /;

export function sobraDoPlano(txs: Tx[], saldo: number): number {
  const asc = [...txs].sort((a, b) => a.at.localeCompare(b.at));
  let i = -1;
  for (let k = asc.length - 1; k >= 0; k--) if (RE_PACOTE_MES.test(asc[k].reason)) { i = k; break; }
  if (i < 0) return 0; // primeira assinatura: nada a expirar
  let concedido = asc[i].delta, gasto = 0;
  for (const t of asc.slice(i + 1)) {
    if (RE_TROCA.test(t.reason)) concedido += t.delta;
    else if (t.delta < 0) { if (!/^(Estorno de pagamento|Créditos do mês anterior)/.test(t.reason)) gasto += -t.delta; }
    else if (/^Estorno/.test(t.reason)) gasto -= t.delta; // geração devolvida: o crédito volta para onde estava
  }
  return Math.max(0, Math.min(saldo, concedido - Math.max(0, gasto)));
}
