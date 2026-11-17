"use client";
import { useLang, useT } from "./I18nProvider";
import { LANGS } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs-client";

/** PT | EN no canto da tela de acesso. */
export default function LangSwitch() {
  const lang = useLang();
  const t = useT();
  const { pickLang } = usePrefs("system");
  return (
    <div className="langsw" role="group" aria-label={t("Idioma")}>
      {LANGS.map((l) => (
        <button key={l.id} type="button" className={lang === l.id ? "on" : ""} aria-pressed={lang === l.id} aria-label={l.label} onClick={() => pickLang(l.id)}>{l.id.toUpperCase()}</button>
      ))}
    </div>
  );
}
