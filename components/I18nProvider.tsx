"use client";
import { createContext, useContext } from "react";
import { Lang, translate } from "@/lib/i18n";

const Ctx = createContext<Lang>("pt");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** Tradutor para componentes de cliente: t("texto em português", { n: 3 }). */
export function useT() {
  const lang = useContext(Ctx);
  return (s: string, vars?: Record<string, string | number>) => translate(lang, s, vars);
}
