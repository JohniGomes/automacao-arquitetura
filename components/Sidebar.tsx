"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const I = (d: string) => <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const FERRAMENTAS = [
  ["/app/mapa", "Mapa de situação", I("M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z")],
  ["/app/moodboard", "Moodboard", I("M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z")],
  ["/app/render", "Render", I("M3 20h18M5 20V9l7-5 7 5v11M10 20v-6h4v6")],
  ["/app/luz", "Variação de luz", I("M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z")],
  ["/app/filme", "Filme do projeto", I("M4 6h12v12H4zM16 10l5-3v10l-5-3")],
] as const;
const CONTA = [
  ["/app/historico", "Histórico", I("M12 7v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v5h-5")],
  ["/app/creditos", "Créditos", I("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12h6M12 9v6")],
] as const;

export default function Sidebar({ name, credits }: { name: string; credits: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [c, setC] = useState(credits);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const upd = () => fetch("/api/auth/me").then((r) => r.json()).then((j) => typeof j.credits === "number" && setC(j.credits));
    window.addEventListener("credits-changed", upd);
    return () => window.removeEventListener("credits-changed", upd);
  }, []);

  const item = ([href, label, icon]: readonly [string, string, React.ReactNode]) => (
    <Link key={href} href={href} className={path === href ? "on" : ""} aria-current={path === href ? "page" : undefined}>{icon}{label}</Link>
  );
  return (
    <>
      <div className="topbar">
        <button className="ghost" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>Menu</button>
        <Link href="/app/mapa" className="brand"><Logo />ArqIA</Link>
        <Link href="/app/creditos" className="credits" style={{ marginLeft: "auto" }}><b>{c}</b>&nbsp;créditos</Link>
      </div>
      <div className={`scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`side ${open ? "open" : ""}`}>
        <Link href="/app/mapa" className="brand"><Logo />ArqIA</Link>
        <div className="group">Ferramentas</div>
        <nav>{FERRAMENTAS.map(item)}</nav>
        <div className="group">Conta</div>
        <nav>{CONTA.map(item)}</nav>
        <div className="foot">
          <Link href="/app/creditos" className="credits"><span>Saldo</span><b>{c}</b></Link>
          <div className="who" title={name}>{name}</div>
          <div className="flinks mini"><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link></div>
          <button className="ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>Sair</button>
        </div>
      </aside>
    </>
  );
}
