/** Tema de Natal da marca (logo e ícone da aba): de 20 de novembro a 6 de janeiro.
 *  `NATAL_TEMA=on` força ligado e `NATAL_TEMA=off` força desligado. */
export function emNatal(agora: Date = new Date()): boolean {
  const f = process.env.NATAL_TEMA;
  if (f === "on") return true;
  if (f === "off") return false;
  const m = agora.getMonth() + 1, d = agora.getDate();
  return (m === 11 && d >= 20) || m === 12 || (m === 1 && d <= 6);
}
