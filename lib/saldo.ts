/** Níveis do saldo de créditos (seguro para o navegador e para o servidor). */
export const MIN_ACAO = 10; // a ação mais barata custa 10 créditos: abaixo disso a pessoa não consegue gerar nada
export type NivelSaldo = "ok" | "baixo" | "acabou";

/** "Acabando": até 10% do que o plano dá por mês (no mínimo 30 créditos, três gerações). */
export const limiteBaixo = (creditosMes?: number) => Math.max(30, Math.round((creditosMes || 0) * 0.1));

export const nivelSaldo = (creditos: number, limite: number): NivelSaldo => (creditos < MIN_ACAO ? "acabou" : creditos <= limite ? "baixo" : "ok");
