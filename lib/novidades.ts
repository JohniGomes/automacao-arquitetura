/** Novidades do Croqui, da mais nova para a mais antiga.
 *  A PRIMEIRA entrada é a versão atual: quando o servidor publica uma entrada nova, quem está com o app aberto vê o
 *  aviso "Nova atualização" com estes itens e o botão Atualizar. Ao publicar algo que o usuário percebe, ACRESCENTE
 *  uma entrada no topo (id novo e único, ex.: data + sufixo) e escreva os itens em linguagem simples, em pt e en. */
export type Texto = { pt: string; en: string };
export type Novidade = { id: string; titulo: Texto; itens: Texto[] };

export const NOVIDADES: Novidade[] = [
  {
    id: "2026-11-28-cro",
    titulo: { pt: "Conheça o Cro, seu assistente", en: "Meet Cro, your assistant" },
    itens: [
      { pt: "Novo: o Cro, um mascote com chat de IA que tira dúvidas sobre as ferramentas, os créditos e os planos.", en: "New: Cro, a mascot with an AI chat that answers questions about the tools, credits and plans." },
      { pt: "Novo: Memorial descritivo. Envie uma foto do projeto e receba o memorial completo, em texto e em Word.", en: "New: Descriptive memorial. Send a photo of your project and get the complete memorial, as text and as a Word file." },
      { pt: "Avisos quando seus créditos estiverem acabando ou acabarem, e o saldo agora conta com animação.", en: "Alerts when your credits are running low or run out, and your balance now counts up with an animation." },
      { pt: "Mais animações pelo app e fotos de fundo em Full HD nas telas de entrada.", en: "More animations across the app and Full HD background photos on the sign-in screens." },
    ],
  },
  {
    id: "2026-11-27-natal",
    titulo: { pt: "Visual novo e clima de Natal", en: "New look and a Christmas touch" },
    itens: [
      { pt: "O app ganhou o novo visual escuro, igual ao da página inicial.", en: "The app now has the new dark look, matching the home page." },
      { pt: "Logo e ícone com gorro de Natal até 6 de janeiro.", en: "Logo and icon with a Santa hat until January 6." },
      { pt: "Página inicial renovada, com vídeo e calculadora de economia.", en: "Redesigned home page, with a video and a savings calculator." },
    ],
  },
];

export const VERSAO_ATUAL = NOVIDADES[0].id;
