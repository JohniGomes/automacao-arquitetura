/** Preço em créditos por unidade. Base: imagem ≈ R$ 0,25 (3 créditos), cena de filme ≈ R$ 3,3 (65 créditos); ver README. */
export const COSTS = {
  mapa: 3,
  moodboard: 3,
  renderPorImagem: 4,
  luz: 3,
  filmeImagemPorCena: 3,
  /** cena completa = 3 (imagem) + 62 (vídeo 5 s) = 65 créditos; custo medido ≈ R$ 3,0 de vídeo (29 mil tokens) + R$ 0,25 de imagem; o clipe de 10 s em 1080p custou R$ 9,02 */
  filmeVideoPorCena: 62,
  /** modo Precisão do render (imagem em 2K) */
  renderPrecisaoPorImagem: 6,
  melhorarPorImagem: 3,
  esbocoPorImagem: 4,
  ideiasPorImagem: 3,
};

/** Custo do render: versões × preço do modo (Rápido ou Precisão). */
export const renderCost = (mode: string, versions: number) => versions * (mode === "precisao" ? COSTS.renderPrecisaoPorImagem : COSTS.renderPorImagem);

/** Créditos avulsos (≈ R$ 0,27–0,29 por crédito, mais caro que a assinatura de propósito). Valores em reais. */
export const PACOTES = [
  { id: "p1", creditos: 100, preco: 29, rotulo: "Iniciante" },
  { id: "p2", creditos: 300, preco: 84, rotulo: "Escritório" },
  { id: "p3", creditos: 700, preco: 189, rotulo: "Estúdio" },
];

/** Assinaturas. No anual os créditos são liberados mês a mês (não acumulam além de 1 mês de saldo). */
export const PLANOS = [
  { id: "essencial", nome: "Essencial", preco: 99, creditosMes: 500, anual: 990, destaque: false,
    itens: ["Todas as ferramentas", "3 projetos ativos", "Histórico de 30 dias", "Fila normal"] },
  { id: "profissional", nome: "Profissional", preco: 159, creditosMes: 800, anual: 1590, destaque: true,
    itens: ["Tudo do Essencial", "Projetos ilimitados", "Histórico de 12 meses", "Fila prioritária", "Render em 2K", "Download sem marca d'água", "Licença de uso comercial"] },
  { id: "max", nome: "Max", preco: 299, creditosMes: 1800, anual: 2990, destaque: false,
    itens: ["Tudo do Profissional", "2 a 3 assentos de equipe", "Filme com até 5 cenas por pedido", "Suporte prioritário", "Acesso antecipado às ferramentas novas"] },
] as const;

export const COSTS_EDICAO = {
  /** cada região editada é uma geração */
  editorPorRegiao: 3,
  /** cada ângulo gerado */
  anguloPorImagem: 2,
};
