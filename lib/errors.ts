/** Erro com mensagem segura para mostrar ao usuário. Qualquer outro erro vira uma mensagem genérica. */
export class UserError extends Error {}
export const GENERIC_ERROR = "Não foi possível concluir a geração. Tente novamente; se o problema continuar, fale com o suporte.";
export const userMessage = (e: unknown) => (e instanceof UserError ? e.message : GENERIC_ERROR);
