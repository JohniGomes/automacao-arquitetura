/** Novidades do Croqui, da mais nova para a mais antiga.
 *  A PRIMEIRA entrada é a versão atual: quando o servidor publica uma entrada nova, quem está com o app aberto vê o
 *  aviso "Nova atualização" com estes itens e o botão Atualizar. Ao publicar algo que o usuário percebe, ACRESCENTE
 *  uma entrada no topo (id novo e único, ex.: data + sufixo) e escreva os itens em linguagem simples, em pt e en. */
export type Texto = { pt: string; en: string };
export type Novidade = { id: string; titulo: Texto; itens: Texto[] };

export const NOVIDADES: Novidade[] = [
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
