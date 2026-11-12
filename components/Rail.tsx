"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import ToolIcon from "./ToolIcon";
import Icon, { IconName } from "./icons";
import { useCredits } from "./useCredits";
import { useLang, useT } from "./I18nProvider";
import { GROUPS, TOOLS, searchTools } from "@/lib/tools";
import { LANG_COOKIE, LANGS, Lang, THEME_COOKIE, Theme } from "@/lib/i18n";

const THEMES: { id: Theme; label: string; icon: IconName }[] = [
  { id: "light", label: "Modo Claro", icon: "sun" },
  { id: "dark", label: "Modo Escuro", icon: "moon" },
  { id: "system", label: "Sistema", icon: "screen" },
];

const setCookie = (k: string, v: string) => { document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`; };

export default function Rail({ name, credits, theme: themeInit }: { name: string; credits: number; theme: Theme }) {
  const path = usePathname();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const c = useCredits(credits);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<null | "acc" | "lang" | "theme">(null);
  const [theme, setTheme] = useState<Theme>(themeInit);
  const [q, setQ] = useState("");
  // botão que abriu o painel: o foco volta para ele ao fechar com Esc
  const opener = useRef<HTMLElement | null>(null);
  const remember = (e: React.MouseEvent) => { opener.current = e.currentTarget as HTMLElement; };

  useEffect(() => { setDrawer(false); setMenu(null); setQ(""); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawer(false); setMenu(null); opener.current?.focus(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const on = (p: string, exact = false) => (exact ? path === p : path.startsWith(p));
  const inTool = TOOLS.some((x) => path.startsWith(x.href));
  const found = searchTools(q);
  const curTheme = THEMES.find((x) => x.id === theme) ?? THEMES[0];

  function pickLang(l: Lang) { setCookie(LANG_COOKIE, l); setMenu(null); router.refresh(); }
  function pickTheme(th: Theme) { setCookie(THEME_COOKIE, th); document.documentElement.dataset.theme = th; setTheme(th); setMenu(null); }

  const Item = ({ href, label, icon, active, cls = "" }: { href: string; label: string; icon: IconName; active: boolean; cls?: string }) => (
    <Link href={href} className={`ritem ${cls} ${active ? "on" : ""}`} aria-current={active ? "page" : undefined}><Icon name={icon} /><span>{label}</span></Link>
  );
  const Prefs = () => (
    <>
      <div className="pgroup">{t("Idioma")}</div>
      {LANGS.map((l) => <button key={l.id} type="button" className={`popopt ${lang === l.id ? "on" : ""}`} aria-pressed={lang === l.id} onClick={() => pickLang(l.id)}>{l.label}</button>)}
      <div className="pgroup">{t("Tema")}</div>
      {THEMES.map((x) => <button key={x.id} type="button" className={`popopt ${theme === x.id ? "on" : ""}`} aria-pressed={theme === x.id} onClick={() => pickTheme(x.id)}><Icon name={x.icon} />{t(x.label)}</button>)}
    </>
  );

  return (
    <>
      <nav className="rail" aria-label={t("Principal")}>
        <Link href="/app" className="rbrand" aria-label={t("Croqui, início")}><Logo /></Link>
        <div className="ritems">
          <Item href="/app" label={t("Início")} icon="home" active={on("/app", true)} />
          <Item href="/app/projetos" label={t("Projetos")} icon="folder" active={on("/app/projetos")} />
          <Item href="/app/geracoes" label={t("Gerações")} icon="gallery" active={on("/app/geracoes")} />
          <button className={`ritem ${drawer || inTool ? "on" : ""}`} aria-expanded={drawer} onClick={(e) => { remember(e); setDrawer(!drawer); setMenu(null); }}><Icon name="tools" /><span>{t("Ferramentas")}</span></button>
        </div>
        <div className="rfoot">
          <Item href="/app/suporte" label={t("Suporte")} icon="support" active={on("/app/suporte")} cls="rextra" />
          <Item href="/app/ajuda" label={t("Ajuda")} icon="help" active={on("/app/ajuda")} cls="rextra" />
          <button className={`ritem rextra ${menu === "lang" ? "on" : ""}`} aria-expanded={menu === "lang"} onClick={(e) => { remember(e); setMenu(menu === "lang" ? null : "lang"); setDrawer(false); }}><Icon name="lang" /><span>{t("Idioma")}</span></button>
          <button className={`ritem rextra ${menu === "theme" ? "on" : ""}`} aria-expanded={menu === "theme"} onClick={(e) => { remember(e); setMenu(menu === "theme" ? null : "theme"); setDrawer(false); }}><Icon name={curTheme.icon} /><span>{t("Tema")}</span></button>
          <Link href="/app/creditos" className="rcredits" title={t("Créditos")}><b>{c}</b><span>{t("créditos")}</span></Link>
          <button className="ritem racc" aria-expanded={menu === "acc"} aria-label={t("Conta")} onClick={(e) => { remember(e); setMenu(menu === "acc" ? null : "acc"); setDrawer(false); }}><Icon name="user" /><span>{t("Conta")}</span></button>
        </div>
      </nav>

      {(drawer || menu) && <div className="dscrim" onClick={() => { setDrawer(false); setMenu(null); }} />}

      {drawer && (
        <aside className="drawer" role="dialog" aria-label={t("Ferramentas")}>
          <h2>{t("Ferramentas")}</h2>
          <input type="text" placeholder={t("Buscar ferramenta")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus={!window.matchMedia("(pointer: coarse)").matches} aria-label={t("Buscar ferramenta")} />
          {GROUPS.map((g) => {
            const list = found.filter((x) => x.group === g);
            return list.length ? (
              <div key={g}>
                <div className="dgroup">{t(g)}</div>
                {list.map((x) => (
                  <Link key={x.id} href={x.href} className={`dtool ${on(x.href) ? "on" : ""}`}><ToolIcon tool={x} size={34} /><span>{t(x.label)}</span></Link>
                ))}
              </div>
            ) : null;
          })}
          {found.length === 0 && <p className="muted small">{t("Nenhuma ferramenta encontrada.")}</p>}
        </aside>
      )}

      {menu === "lang" && (
        <div className="pop pop-sm" role="dialog" aria-label={t("Menu")}>
          <div className="pgroup first">{t("Idioma")}</div>
          {LANGS.map((l) => <button key={l.id} type="button" className={`popopt ${lang === l.id ? "on" : ""}`} aria-pressed={lang === l.id} onClick={() => pickLang(l.id)}>{l.label}</button>)}
        </div>
      )}
      {menu === "theme" && (
        <div className="pop pop-sm" role="dialog" aria-label={t("Menu")}>
          <div className="pgroup first">{t("Tema")}</div>
          {THEMES.map((x) => <button key={x.id} type="button" className={`popopt ${theme === x.id ? "on" : ""}`} aria-pressed={theme === x.id} onClick={() => pickTheme(x.id)}><Icon name={x.icon} />{t(x.label)}</button>)}
        </div>
      )}
      {menu === "acc" && (
        <div className="pop" role="dialog" aria-label={t("Menu")}>
          <div className="pname" title={name}>{name}</div>
          <Link href="/app/creditos">{t("Créditos e extrato")}</Link>
          <Link href="/app/ajuda" className="pmob">{t("Ajuda")}</Link>
          <Link href="/app/suporte" className="pmob">{t("Suporte")}</Link>
          <div className="pmob"><Prefs /></div>
          <Link href="/termos">{t("Termos de Uso")}</Link>
          <Link href="/privacidade">{t("Política de Privacidade")}</Link>
          <button className="ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>{t("Sair")}</button>
        </div>
      )}
    </>
  );
}
