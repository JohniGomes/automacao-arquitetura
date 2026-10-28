"use client";
import { useState } from "react";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    if (r.ok) location.href = "/app"; else { setErr(j.error); setBusy(false); }
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <main className="hero">
      <h1>ArqIA</h1>
      <p className="muted">Mapa de situação, moodboard, render, variações de luz e filme do projeto — com IA, para arquitetos.</p>
      <form className="card" onSubmit={go}>
        {mode === "register" && <div className="field"><label>Nome</label><input type="text" value={f.name} onChange={set("name")} /></div>}
        <div className="field"><label>E-mail</label><input type="email" required value={f.email} onChange={set("email")} /></div>
        <div className="field"><label>Senha</label><input type="password" required minLength={8} value={f.password} onChange={set("password")} /></div>
        {err && <p className="err">{err}</p>}
        <button disabled={busy}>{mode === "login" ? "Entrar" : "Criar conta"}</button>{" "}
        <a className="btn ghost" style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--line)" }} href="/api/auth/google">Entrar com Google</a>
        <p className="small muted">
          {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); }}>{mode === "login" ? "Criar conta" : "Entrar"}</a>
        </p>
      </form>
      <p className="small muted">A IA não substitui a responsabilidade técnica do arquiteto.</p>
    </main>
  );
}
