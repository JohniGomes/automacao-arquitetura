import { EN } from "./en";

export type Lang = "pt" | "en";
export type Theme = "light" | "dark" | "system";
export const LANGS: { id: Lang; label: string }[] = [{ id: "pt", label: "Português" }, { id: "en", label: "English" }];
export const LANG_COOKIE = "lang";
export const THEME_COOKIE = "theme";

type Vars = Record<string, string | number>;

// chaves com {nome} viram padrões: aceitam textos montados com números, nomes de cena etc.
const PATTERNS = Object.entries(EN).filter(([k]) => k.includes("{")).map(([k, v]) => {
  const names: string[] = [];
  const re = new RegExp("^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, (_, n) => { names.push(n); return "(.+?)"; }) + "$");
  return { re, names, v };
});

/** O texto-base do app é o português: ele é a chave do dicionário. Sem tradução, devolve o próprio texto. */
export function translate(lang: Lang, s: string, vars?: Vars): string {
  let out = s;
  if (lang === "en") {
    const hit = EN[s];
    if (hit !== undefined) out = hit;
    else for (const p of PATTERNS) {
      const m = s.match(p.re);
      // os trechos capturados também são traduzidos ("Multi-ângulo — {a}" com a = "45° à direita, de cima")
      if (m) { out = p.v.replace(/\{(\w+)\}/g, (_, n) => translate(lang, m[p.names.indexOf(n) + 1] ?? "")); break; }
    }
  }
  return vars ? out.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : out;
}
