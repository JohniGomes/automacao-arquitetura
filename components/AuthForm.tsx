"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";
import { useT } from "./I18nProvider";

const ERROS: Record<string, string> = {
  aceite: "Para criar conta com o Google, aceite os Termos de Uso e a Política de Privacidade.",
};

export default function AuthForm({ mode, erro }: { mode: "login" | "register"; erro?: string }) {
  const t = useT();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [aceite, setAceite] = useState(false);
  const [err, setErr] = useState(erro ? t(ERROS[erro] || "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.") : "");
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (reg && !aceite) { setErr(t("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.")); return; }
    setBusy(true);
    const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, aceite }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.href = "/app"; else { setErr(t(j.error || "Erro ao entrar. Tente novamente.")); setBusy(false); }
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const googleOff = reg && !aceite;

  return (
    <form className="box" onSubmit={go}>
      <Link href="/" className="brand"><Logo />ArqIA</Link>
      <h1>{reg ? t("Criar sua conta") : t("Entrar")}</h1>
      {reg && <div className="field"><label htmlFor="nome">{t("Nome")}</label><input id="nome" type="text" autoComplete="name" value={f.name} onChange={set("name")} /></div>}
      <div className="field"><label htmlFor="email">{t("E-mail")}</label><input id="email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></div>
      <div className="field"><label htmlFor="senha">{t("Senha")}</label><input id="senha" type="password" required minLength={8} autoComplete={reg ? "new-password" : "current-password"} value={f.password} onChange={set("password")} />
        {reg && <p className="small muted">{t("Mínimo de 8 caracteres.")}</p>}</div>
      {reg && (
        <label className="accept" htmlFor="aceite">
          <input id="aceite" type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>{t("Li e aceito os")} <Link href="/termos" target="_blank">{t("Termos de Uso")}</Link> {t("e a")} <Link href="/privacidade" target="_blank">{t("Política de Privacidade")}</Link>.</span>
        </label>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="full" disabled={busy}>{reg ? t("Criar conta") : t("Entrar")}</button>
      <div style={{ height: 10 }} />
      <a className="btn ghost full" href={reg ? "/api/auth/google?aceite=1" : "/api/auth/google"} aria-disabled={googleOff} tabIndex={googleOff ? -1 : undefined} title={googleOff ? t("Aceite os Termos para continuar com o Google") : undefined}>{t("Continuar com Google")}</a>
      <p className="sw">{reg ? t("Já tem conta?") : t("Ainda não tem conta?")} <Link href={reg ? "/login" : "/cadastro"}>{reg ? t("Fazer login") : t("Assinar")}</Link></p>
    </form>
  );
}
