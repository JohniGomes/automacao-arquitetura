"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header({ name, credits }: { name: string; credits: number }) {
  const [c, setC] = useState(credits);
  useEffect(() => {
    const upd = () => fetch("/api/auth/me").then((r) => r.json()).then((j) => typeof j.credits === "number" && setC(j.credits));
    window.addEventListener("credits-changed", upd);
    return () => window.removeEventListener("credits-changed", upd);
  }, []);
  return (
    <header className="top"><div className="wrap">
      <Link className="brand" href="/app">ArqIA</Link>
      <nav>
        <Link href="/app/mapa">Mapa de situação</Link><Link href="/app/moodboard">Moodboard</Link><Link href="/app/render">Render</Link>
        <Link href="/app/luz">Luz</Link><Link href="/app/filme">Filme</Link><Link href="/app/historico">Histórico</Link>
      </nav>
      <Link className="credits" href="/app/creditos" title={name}>{c} créditos</Link>
      <button className="ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>Sair</button>
    </div></header>
  );
}
