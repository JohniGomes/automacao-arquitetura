"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IconName } from "@/components/icons";
import { LANG_COOKIE, Lang, THEME_COOKIE, Theme } from "./i18n";

/** Temas oferecidos ao usuário. O texto é a chave do dicionário (lib/en.ts). */
export const THEMES: { id: Theme; label: string; icon: IconName }[] = [
  { id: "light", label: "Modo Claro", icon: "sun" },
  { id: "dark", label: "Modo Escuro", icon: "moon" },
  { id: "system", label: "Sistema", icon: "screen" },
];

const setCookie = (k: string, v: string) => { document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`; };

/** Idioma e tema: grava o cookie, aplica na hora e avisa quem chamou (para fechar o menu, por exemplo). */
export function usePrefs(themeInit: Theme, onDone?: () => void) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(themeInit);
  function pickLang(l: Lang) { setCookie(LANG_COOKIE, l); onDone?.(); router.refresh(); }
  function pickTheme(th: Theme) { setCookie(THEME_COOKIE, th); document.documentElement.dataset.theme = th; setTheme(th); onDone?.(); }
  return { theme, pickLang, pickTheme };
}
