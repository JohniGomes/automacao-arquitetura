"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";

export default function AuthForm({ mode, erro }: { mode: "login" | "register"; erro?: string }) {
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(erro ? "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha." : "");
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.href = "/app/mapa"; else { setErr(j.error || "Erro ao entrar. Tente novamente."); setBusy(false); }
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form className="box" onSubmit={go}>
      <Link href="/" className="brand"><Logo />ArqIA</Link>
      <h1>{reg ? "Criar sua conta" : "Entrar"}</h1>
      <p className="muted">{reg ? "Cadastre-se para gerar mapa, moodboard, render, luz e filme." : "Acesse suas gerações e créditos."}</p>
      {reg && <div className="field"><label htmlFor="nome">Nome</label><input id="nome" type="text" autoComplete="name" value={f.name} onChange={set("name")} /></div>}
      <div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></div>
      <div className="field"><label htmlFor="senha">Senha</label><input id="senha" type="password" required minLength={8} autoComplete={reg ? "new-password" : "current-password"} value={f.password} onChange={set("password")} />
        {reg && <p className="small muted">Mínimo de 8 caracteres.</p>}</div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="full" disabled={busy}>{reg ? "Criar conta" : "Entrar"}</button>
      <div style={{ height: 10 }} />
      <a className="btn ghost full" href="/api/auth/google">Continuar com Google</a>
      <p className="sw">{reg ? "Já tem conta? " : "Ainda não tem conta? "}<Link href={reg ? "/login" : "/cadastro"}>{reg ? "Fazer login" : "Assinar"}</Link></p>
    </form>
  );
}
