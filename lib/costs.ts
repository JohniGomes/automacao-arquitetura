/** Preço em créditos por unidade. Regra atual: nenhuma ação custa menos de 10 créditos; cena de filme animado = 15 créditos. O custo real de uma imagem de IA é ≈ R$ 0,28; ver README. */
export const COSTS = {
  mapa: 10, mapaPrancha: 10, mapaAmbos: 15, // mapa = vista aérea ilustrativa (1 imagem de IA); mapaPrancha = prancha por código, sem IA; mapaAmbos = as duas juntas
  moodboard: 10,
  renderPorImagem: 10,
  luz: 10,
  filmeImagemPorCena: 3,
  /** cena completa = 3 (imagem) + 12 (animação) = 15 créditos. A animação roda no servidor (ffmpeg) e não gasta IA de vídeo; o vídeo de IA custava ≈ R$ 3,1 por clipe de 5 s e foi retirado do produto */
  filmeAnimacaoPorCena: 12,
  /** modo Precisão do render (imagem em 2K) */
  renderPrecisaoPorImagem: 15,
  melhorarPorImagem: 10,
  esbocoPorImagem: 10,
  ideiasPorImagem: 10,
};

/** Custo do render: versões × preço do modo (Rápido ou Precisão). */
export const renderCost = (mode: string, versions: number) => versions * (mode === "precisao" ? COSTS.renderPrecisaoPorImagem : COSTS.renderPorImagem);

/** Créditos avulsos (R$ 0,33, 0,25 e 0,20 por crédito: sempre mais caro que a assinatura, de propósito). Valores em reais. */
export const PACOTES = [
  { id: "p1", creditos: 30, preco: 9.9, rotulo: "Iniciante" },
  { id: "p2", creditos: 120, preco: 29.9, rotulo: "Escritório" },
  { id: "p3", creditos: 300, preco: 59.9, rotulo: "Estúdio" },
];

/** Assinaturas mensais (não há plano anual). Os créditos do mês não acumulam além de 1 mês de saldo. */
export const PLANOS = [
  { id: "essencial", nome: "Essencial", preco: 49.9, creditosMes: 500, destaque: false,
    itens: ["Todas as ferramentas", "3 projetos ativos", "Histórico de 30 dias", "Fila normal", "Mapa de situação até 600 m, vista aérea com 5 lugares", "2 gerações ao mesmo tempo", "Suporte por e-mail"] },
  { id: "profissional", nome: "Profissional", preco: 89.9, creditosMes: 1000, destaque: true,
    itens: ["Tudo do Essencial", "Projetos ilimitados", "Histórico de 12 meses", "Fila prioritária", "Render em 2K", "Download sem marca d'água", "Licença de uso comercial", "Mapa de situação até 1 km, vista aérea com 9 lugares", "Prancha do mapa em SVG vetorial", "Logo e nome do escritório na prancha", "1 link de apresentação para o cliente", "3 gerações ao mesmo tempo", "Suporte por e-mail"] },
  { id: "max", nome: "Max", preco: 129.9, creditosMes: 1500, destaque: false,
    itens: ["Tudo do Profissional", "Filme com até 5 cenas por pedido", "Mapa de situação em DXF para AutoCAD (UTM SIRGAS 2000)", "Responsável técnico e cor própria na prancha", "Links de apresentação ilimitados", "5 gerações ao mesmo tempo", "Suporte prioritário por WhatsApp", "Acesso antecipado às ferramentas novas"] },
] as const;

export const COSTS_EDICAO = {
  /** cada região editada é uma geração */
  editorPorRegiao: 10,
  /** cada ângulo gerado */
  anguloPorImagem: 10,
};
