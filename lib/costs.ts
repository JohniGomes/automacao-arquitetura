/** Preço em créditos por unidade. Calibrar depois de medir o custo real (ver README). */
export const COSTS = {
  mapa: 3,
  moodboard: 3,
  renderPorImagem: 4,
  luz: 3,
  filmeImagemPorCena: 3,
  filmeVideoPorCena: 10,
};

/** Pacotes de crédito exibidos na tela (preços fictícios até a cobrança ser integrada e os custos medidos). */
export const PACOTES = [
  { id: "p1", creditos: 100, rotulo: "Iniciante" },
  { id: "p2", creditos: 400, rotulo: "Escritório" },
  { id: "p3", creditos: 1000, rotulo: "Estúdio" },
];
