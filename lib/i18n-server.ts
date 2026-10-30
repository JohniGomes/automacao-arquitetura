import { cookies, headers } from "next/headers";
import { LANG_COOKIE, THEME_COOKIE, Lang, Theme, translate } from "./i18n";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (c === "en" || c === "pt") return c;
  return /^en/i.test((await headers()).get("accept-language") || "") ? "en" : "pt";
}

export async function getTheme(): Promise<Theme> {
  const c = (await cookies()).get(THEME_COOKIE)?.value;
  return c === "dark" || c === "system" ? c : "light";
}

/** Tradutor para componentes de servidor. */
export async function getT() {
  const lang = await getLang();
  return { lang, t: (s: string, vars?: Record<string, string | number>) => translate(lang, s, vars) };
}
