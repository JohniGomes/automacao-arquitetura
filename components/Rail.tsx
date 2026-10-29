"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import ToolIcon from "./ToolIcon";
import { useCredits } from "./useCredits";
import { usePins } from "@/lib/usePins";
import { GROUPS, TOOLS, searchTools, toolById } from "@/lib/tools";

const Ic = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  image: "M4 5h16v14H4zM4 16l4-4 4 4 3-3 5 5M9 9.5h.01",
  tools: "M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
};

export default function Rail({ name, credits }: { name: string; credits: number }) {
  const path = usePathname();
  const c = useCredits(credits);
  const { pins } = usePins();
  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => { setDrawer(false); setPop(false); setQ(""); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawer(false); setPop(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const on = (p: string, exact = false) => (exact ? path === p : path.startsWith(p));
  const inTool = TOOLS.some((t) => path.startsWith(t.href));
  const found = searchTools(q);

  const Item = ({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) => (
    <Link href={href} className={`ritem ${active ? "on" : ""}`} aria-current={active ? "page" : undefined}><Ic d={icon} /><span>{label}</span></Link>
  );

  return (
    <>
      <nav className="rail" aria-label="Principal">
        <Link href="/app" className="rbrand" aria-label="ArqIA, início"><Logo /></Link>
        <div className="ritems">
          <Item href="/app" label="Início" icon={I.home} active={on("/app", true)} />
          <Item href="/app/projetos" label="Projetos" icon={I.folder} active={on("/app/projetos")} />
          <Item href="/app/geracoes" label="Gerações" icon={I.image} active={on("/app/geracoes")} />
          <button className={`ritem ${drawer || inTool ? "on" : ""}`} aria-expanded={drawer} onClick={() => { setDrawer(!drawer); setPop(false); }}><Ic d={I.tools} /><span>Ferramentas</span></button>
        </div>
        <div className="rpins" aria-label="Atalhos">
          {pins.map((id) => { const t = toolById(id); return t ? (
            <Link key={id} href={t.href} className={`ritem ${on(t.href) ? "on" : ""}`} title={t.label}><Ic d={t.icon} /><span>{t.label.split(" ")[0]}</span></Link>
          ) : null; })}
        </div>
        <div className="rfoot">
          <Link href="/app/creditos" className="rcredits" title="Créditos"><b>{c}</b><span>créditos</span></Link>
          <button className="ritem racc" aria-expanded={pop} aria-label="Conta" onClick={() => { setPop(!pop); setDrawer(false); }}><Ic d={I.user} /><span>Conta</span></button>
        </div>
      </nav>

      {(drawer || pop) && <div className="dscrim" onClick={() => { setDrawer(false); setPop(false); }} />}

      {drawer && (
        <aside className="drawer" aria-label="Ferramentas">
          <h2>Ferramentas</h2>
          <input type="text" placeholder="Buscar ferramenta" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar ferramenta" />
          {GROUPS.map((g) => {
            const list = found.filter((t) => t.group === g);
            return list.length ? (
              <div key={g}>
                <div className="dgroup">{g}</div>
                {list.map((t) => (
                  <Link key={t.id} href={t.href} className={`dtool ${on(t.href) ? "on" : ""}`}><ToolIcon tool={t} size={34} /><span>{t.label}</span></Link>
                ))}
              </div>
            ) : null;
          })}
          {found.length === 0 && <p className="muted small">Nenhuma ferramenta encontrada.</p>}
        </aside>
      )}

      {pop && (
        <div className="pop" role="menu">
          <div className="pname" title={name}>{name}</div>
          <Link href="/app/creditos" role="menuitem">Créditos e extrato</Link>
          <Link href="/termos" role="menuitem">Termos de Uso</Link>
          <Link href="/privacidade" role="menuitem">Política de Privacidade</Link>
          <button className="ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>Sair</button>
        </div>
      )}
    </>
  );
}
