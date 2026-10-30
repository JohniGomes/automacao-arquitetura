"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import ToolIcon from "./ToolIcon";
import { useCredits } from "./useCredits";
import { useLang, useT } from "./I18nProvider";
import { GROUPS, TOOLS, searchTools } from "@/lib/tools";
import { LANG_COOKIE, LANGS, Lang, THEME_COOKIE, Theme } from "@/lib/i18n";

const Ic = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  image: "M4 5h16v14H4zM4 16l4-4 4 4 3-3 5 5M9 9.5h.01",
  tools: "M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01",
  support: "M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1zM17 19c0 1.2-1.3 2-3 2h-2",
  lang: "M4 5h9M8.5 3v2M6 5c.6 3 2.7 5.6 5.5 7M12 5c-.6 3.2-3.4 6.4-7 8M13 20l4-9 4 9M14.5 17h5",
  sun: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  screen: "M3 5h18v11H3zM8 20h8M12 16v4",
};

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: "light", label: "Modo Claro", icon: I.sun },
  { id: "dark", label: "Modo Escuro", icon: I.moon },
  { id: "system", label: "Sistema", icon: I.screen },
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

  useEffect(() => { setDrawer(false); setMenu(null); setQ(""); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawer(false); setMenu(null); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const on = (p: string, exact = false) => (exact ? path === p : path.startsWith(p));
  const inTool = TOOLS.some((x) => path.startsWith(x.href));
  const found = searchTools(q);
  const curTheme = THEMES.find((x) => x.id === theme) ?? THEMES[0];

  function pickLang(l: Lang) { setCookie(LANG_COOKIE, l); setMenu(null); router.refresh(); }
  function pickTheme(th: Theme) { setCookie(THEME_COOKIE, th); document.documentElement.dataset.theme = th; setTheme(th); setMenu(null); }

  const Item = ({ href, label, icon, active, cls = "" }: { href: string; label: string; icon: string; active: boolean; cls?: string }) => (
    <Link href={href} className={`ritem ${cls} ${active ? "on" : ""}`} aria-current={active ? "page" : undefined}><Ic d={icon} /><span>{label}</span></Link>
  );
  const Prefs = () => (
    <>
      <div className="pgroup">{t("Idioma")}</div>
      {LANGS.map((l) => <button key={l.id} type="button" className={`popopt ${lang === l.id ? "on" : ""}`} aria-pressed={lang === l.id} onClick={() => pickLang(l.id)}>{l.label}</button>)}
      <div className="pgroup">{t("Tema")}</div>
      {THEMES.map((x) => <button key={x.id} type="button" className={`popopt ${theme === x.id ? "on" : ""}`} aria-pressed={theme === x.id} onClick={() => pickTheme(x.id)}><Ic d={x.icon} />{t(x.label)}</button>)}
    </>
  );

  return (
    <>
      <nav className="rail" aria-label={t("Principal")}>
        <Link href="/app" className="rbrand" aria-label={t("ArqIA, início")}><Logo /></Link>
        <div className="ritems">
          <Item href="/app" label={t("Início")} icon={I.home} active={on("/app", true)} />
          <Item href="/app/projetos" label={t("Projetos")} icon={I.folder} active={on("/app/projetos")} />
          <Item href="/app/geracoes" label={t("Gerações")} icon={I.image} active={on("/app/geracoes")} />
          <button className={`ritem ${drawer || inTool ? "on" : ""}`} aria-expanded={drawer} onClick={() => { setDrawer(!drawer); setMenu(null); }}><Ic d={I.tools} /><span>{t("Ferramentas")}</span></button>
        </div>
        <div className="rfoot">
          <Item href="/app/suporte" label={t("Suporte")} icon={I.support} active={on("/app/suporte")} cls="rextra" />
          <Item href="/app/ajuda" label={t("Ajuda")} icon={I.help} active={on("/app/ajuda")} cls="rextra" />
          <button className={`ritem rextra ${menu === "lang" ? "on" : ""}`} aria-expanded={menu === "lang"} onClick={() => { setMenu(menu === "lang" ? null : "lang"); setDrawer(false); }}><Ic d={I.lang} /><span>{t("Idioma")}</span></button>
          <button className={`ritem rextra ${menu === "theme" ? "on" : ""}`} aria-expanded={menu === "theme"} onClick={() => { setMenu(menu === "theme" ? null : "theme"); setDrawer(false); }}><Ic d={curTheme.icon} /><span>{t("Tema")}</span></button>
          <Link href="/app/creditos" className="rcredits" title={t("Créditos")}><b>{c}</b><span>{t("créditos")}</span></Link>
          <button className="ritem racc" aria-expanded={menu === "acc"} aria-label={t("Conta")} onClick={() => { setMenu(menu === "acc" ? null : "acc"); setDrawer(false); }}><Ic d={I.user} /><span>{t("Conta")}</span></button>
        </div>
      </nav>

      {(drawer || menu) && <div className="dscrim" onClick={() => { setDrawer(false); setMenu(null); }} />}

      {drawer && (
        <aside className="drawer" aria-label={t("Ferramentas")}>
          <h2>{t("Ferramentas")}</h2>
          <input type="text" placeholder={t("Buscar ferramenta")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label={t("Buscar ferramenta")} />
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
        <div className="pop pop-sm" role="menu">
          <div className="pgroup first">{t("Idioma")}</div>
          {LANGS.map((l) => <button key={l.id} type="button" className={`popopt ${lang === l.id ? "on" : ""}`} aria-pressed={lang === l.id} onClick={() => pickLang(l.id)}>{l.label}</button>)}
        </div>
      )}
      {menu === "theme" && (
        <div className="pop pop-sm" role="menu">
          <div className="pgroup first">{t("Tema")}</div>
          {THEMES.map((x) => <button key={x.id} type="button" className={`popopt ${theme === x.id ? "on" : ""}`} aria-pressed={theme === x.id} onClick={() => pickTheme(x.id)}><Ic d={x.icon} />{t(x.label)}</button>)}
        </div>
      )}
      {menu === "acc" && (
        <div className="pop" role="menu">
          <div className="pname" title={name}>{name}</div>
          <Link href="/app/creditos" role="menuitem">{t("Créditos e extrato")}</Link>
          <Link href="/app/ajuda" role="menuitem" className="pmob">{t("Ajuda")}</Link>
          <Link href="/app/suporte" role="menuitem" className="pmob">{t("Suporte")}</Link>
          <div className="pmob"><Prefs /></div>
          <Link href="/termos" role="menuitem">{t("Termos de Uso")}</Link>
          <Link href="/privacidade" role="menuitem">{t("Política de Privacidade")}</Link>
          <button className="ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>{t("Sair")}</button>
        </div>
      )}
    </>
  );
}
