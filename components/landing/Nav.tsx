"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "../icons";
import Logo from "../Logo";
import ToolIcon from "../ToolIcon";
import { useLang, useT } from "../I18nProvider";
import { LANGS } from "@/lib/i18n";
import { TOOLS } from "@/lib/tools";
import { usePrefs } from "@/lib/prefs-client";

/** Bandeiras redondas, desenhadas para ficarem legíveis em 24-28 px. */
const BR = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs><clipPath id="fl-br"><circle cx="16" cy="16" r="16" /></clipPath></defs>
    <g clipPath="url(#fl-br)">
      <rect width="32" height="32" fill="#1FA64B" />
      <path d="M16 3.6 29.2 16 16 28.4 2.8 16z" fill="#FFD60A" />
      <circle cx="16" cy="16" r="6.6" fill="#1B3F9B" />
      <path d="M9.6 14.4c4.2-1.6 9.4-.6 12.9 2.8" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);
const EN = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs><clipPath id="fl-en"><circle cx="16" cy="16" r="16" /></clipPath></defs>
    <g clipPath="url(#fl-en)">
      <rect width="32" height="32" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={(i * 32) / 13} width="32" height={32 / 13} fill="#D12F3D" />)}
      <rect width="15" height={(7 * 32) / 13} fill="#27408B" />
      {[[3.5, 3], [7.5, 3], [11.5, 3], [5.5, 6.5], [9.5, 6.5], [3.5, 10], [7.5, 10], [11.5, 10]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.95" fill="#fff" />)}
    </g>
  </svg>
);

/** Menu suspenso: abre ao passar o mouse, ao tocar ou com o teclado; fecha com Esc ou ao clicar fora. */
function Drop({ id, label, open, setOpen, children }: { id: string; label: string; open: string; setOpen: (v: string) => void; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <div className="lp-drop" onMouseEnter={() => matchMedia("(hover: hover)").matches && setOpen(id)} onMouseLeave={() => matchMedia("(hover: hover)").matches && setOpen("")}>
      <button type="button" className="lp-dropbtn" aria-expanded={isOpen} aria-haspopup="true" onClick={() => setOpen(isOpen ? "" : id)}>
        {label}<Icon name="chevron" />
      </button>
      {isOpen && <div className="lp-menu" role="menu" onClick={() => setOpen("")}>{children}</div>}
    </div>
  );
}

/** Cabeçalho da landing: logo, menus, idioma, entrar e criar conta. */
export default function Nav({ logged, natal = false }: { logged: boolean; natal?: boolean }) {
  const t = useT();
  const lang = useLang();
  const { pickLang } = usePrefs("system");
  const [open, setOpen] = useState("");
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(""); setMobile(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(""); setMobile(false); } };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, []);

  const Flag = lang === "en" ? EN : BR;
  const close = () => { setOpen(""); setMobile(false); };
  const cases: [string, string][] = [["Estudantes e entusiastas", "school"], ["Escritórios de arquitetura", "building"], ["Profissionais autônomos", "laptop"]];

  return (
    <header className="lp-nav" ref={ref}>
      <div className="lp-in lp-navin">
        <Link href="/" className="brand" style={{ padding: 0 }}><Logo natal={natal} />Croqui</Link>

        <nav className="lp-links" aria-label={t("Principal")}>
          <Drop id="tools" label={t("Ferramentas")} open={open} setOpen={setOpen}>
            <div className="lp-menugrid">
              {TOOLS.map((x) => <a key={x.id} href="#ferramentas" role="menuitem"><ToolIcon tool={x} size={28} /><span>{t(x.label)}</span></a>)}
            </div>
          </Drop>
          <Drop id="cases" label={t("Casos de uso")} open={open} setOpen={setOpen}>
            {cases.map(([c, ic]) => <a key={c} href="#para-quem" role="menuitem"><span className="lp-mi"><Icon name={ic as "school"} /></span><span>{t(c)}</span></a>)}
          </Drop>
          <Drop id="res" label={t("Recursos")} open={open} setOpen={setOpen}>
            <a href="#etapas" role="menuitem"><span className="lp-mi"><Icon name="tools" /></span><span>{t("Como funciona")}</span></a>
            <a href="#beneficios" role="menuitem"><span className="lp-mi"><Icon name="bolt" /></span><span>{t("Benefícios")}</span></a>
            <a href="#faq" role="menuitem"><span className="lp-mi"><Icon name="help" /></span><span>{t("Perguntas frequentes")}</span></a>
          </Drop>
          <a className="lp-link" href="#planos">{t("Planos")}</a>
        </nav>

        <div className="lp-acts">
          <div className="lp-lang">
            <button type="button" className="lp-langbtn" aria-label={t("Idioma")} aria-expanded={open === "lang"} onClick={() => setOpen(open === "lang" ? "" : "lang")}><span className="lp-flag"><Flag /></span><span className="lp-langcode">{lang === "en" ? "EN" : "PT"}</span><Icon name="chevron" /></button>
            {open === "lang" && (
              <div className="lp-menu lp-menu-r" role="menu">
                {LANGS.map((l) => (
                  <button key={l.id} type="button" role="menuitemradio" aria-checked={lang === l.id} className={lang === l.id ? "on" : ""} onClick={() => { setOpen(""); pickLang(l.id); }}>
                    <span className="lp-flag">{l.id === "en" ? <EN /> : <BR />}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {logged ? (
            <Link className="btn" href="/app">{t("Abrir o app")}</Link>
          ) : (
            <>
              <Link className="lp-signin" href="/login">{t("Entrar")}</Link>
              <Link className="btn lp-cta-nav" href="/cadastro">{t("Criar conta grátis")}</Link>
            </>
          )}
          <button type="button" className="lp-burger" aria-label={mobile ? t("Fechar") : t("Menu")} aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Icon name={mobile ? "close" : "menu"} /></button>
        </div>
      </div>

      {mobile && (
        <div className="lp-mobile" onClick={close}>
          <a href="#ferramentas">{t("Ferramentas")}</a>
          <a href="#para-quem">{t("Casos de uso")}</a>
          <a href="#etapas">{t("Como funciona")}</a>
          <a href="#beneficios">{t("Benefícios")}</a>
          <a href="#planos">{t("Planos")}</a>
          <a href="#faq">{t("Perguntas frequentes")}</a>
          {!logged && <Link href="/login">{t("Entrar")}</Link>}
          {!logged && <Link className="btn lg" href="/cadastro" style={{ marginTop: 16 }}>{t("Criar conta grátis")}</Link>}
        </div>
      )}
    </header>
  );
}
