"use client";
import Link from "next/link";
import Icon from "./icons";
import { useLang, useT } from "./I18nProvider";
import { useCredits } from "./useCredits";
import { LANGS, Theme } from "@/lib/i18n";
import { THEMES, usePrefs } from "@/lib/prefs-client";

/** Tela "Conta": créditos, plano, preferências e documentos, em lista agrupada (como os Ajustes do iOS). */
export default function AccountView({ name, email, credits, planLine, theme: themeInit }: { name: string; email: string; credits: number; planLine: string; theme: Theme }) {
  const t = useT();
  const lang = useLang();
  const c = useCredits(credits);
  const { theme, pickLang, pickTheme } = usePrefs(themeInit);
  const initial = (name.trim()[0] || email[0] || "?").toUpperCase();

  return (
    <>
      <div className="acchead">
        <span className="avatar" aria-hidden="true">{initial}</span>
        <div className="accwho"><strong>{name}</strong><span>{email}</span></div>
      </div>

      <section className="accbalance" aria-label={t("Créditos")}>
        <div><span className="lbl">{t("Saldo")}</span><b>{c ?? "…"}</b><span className="unit">{t("créditos")}</span></div>
        <p>{planLine}</p>
        <Link href="/app/creditos" className="btn">{t("Comprar créditos")}</Link>
      </section>

      <h2 className="grouptitle">{t("Conta")}</h2>
      <div className="list">
        <Link href="/app/creditos" className="row-link"><Icon name="credits" /><span>{t("Créditos e extrato")}</span></Link>
        <Link href="/app/ajuda" className="row-link"><Icon name="help" /><span>{t("Ajuda")}</span></Link>
        <Link href="/app/suporte" className="row-link"><Icon name="support" /><span>{t("Suporte")}</span></Link>
      </div>

      <h2 className="grouptitle">{t("Preferências")}</h2>
      <div className="list">
        <div className="row-ctl">
          <span className="rl">{t("Idioma")}</span>
          <div className="seg" role="group" aria-label={t("Idioma")}>
            {LANGS.map((l) => <button key={l.id} type="button" className={lang === l.id ? "on" : ""} aria-pressed={lang === l.id} onClick={() => pickLang(l.id)}>{l.label}</button>)}
          </div>
        </div>
        <div className="row-ctl">
          <span className="rl">{t("Tema")}</span>
          <div className="seg" role="group" aria-label={t("Tema")}>
            {THEMES.map((x) => <button key={x.id} type="button" className={theme === x.id ? "on" : ""} aria-pressed={theme === x.id} onClick={() => pickTheme(x.id)}>{t(x.label)}</button>)}
          </div>
        </div>
      </div>

      <h2 className="grouptitle">{t("Legal")}</h2>
      <div className="list">
        <Link href="/termos" className="row-link"><span>{t("Termos de Uso")}</span></Link>
        <Link href="/privacidade" className="row-link"><span>{t("Política de Privacidade")}</span></Link>
      </div>

      <button type="button" className="ghost signout" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>{t("Sair")}</button>
    </>
  );
}
