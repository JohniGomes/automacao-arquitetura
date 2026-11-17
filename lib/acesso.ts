/** Fundos das telas de acesso (login, cadastro, recuperação). A troca é guardada em um cookie para o servidor já mostrar o certo. */
export const FUNDOS = ["/acesso/1.jpg", "/acesso/2.jpg", "/acesso/3.jpg", "/acesso/4.jpg", "/acesso/5.jpg", "/acesso/6.jpg"];
export const FUNDO_COOKIE = "acesso-bg";
export const fundoValido = (v: string | undefined) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n < FUNDOS.length ? n : 0; };
