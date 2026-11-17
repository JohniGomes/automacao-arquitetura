"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "./icons";
import LangSwitch from "./LangSwitch";
import Logo from "./Logo";
import { useT } from "./I18nProvider";
import PasswordInput from "./PasswordInput";

const ERROS: Record<string, string> = {
  aceite: "Para criar conta com o Google, aceite os Termos de Uso e a Política de Privacidade.",
  "conta-existente": "Já existe uma conta com este e-mail. Entre com e-mail e senha.",
};

/** Marca "G" do Google, nas cores oficiais, para o botão de entrada. */
const GoogleG = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function AuthForm({ mode, erro }: { mode: "login" | "register"; erro?: string }) {
  const t = useT();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [aceite, setAceite] = useState(false);
  const [err, setErr] = useState(erro ? t(ERROS[erro] || "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.") : "");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
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
    <>
      <LangSwitch />
      <div className="box">
        <Link href="/" className="brand"><Logo />Croqui</Link>
        <h1>{reg ? t("Criar sua conta") : t("Bem-vindo ao Croqui")}</h1>
        <p className="gsub">{reg ? t("Comece em menos de um minuto.") : t("Entre com sua conta")}</p>

        {err && <p className="err" role="alert">{err}</p>}

        {reg && (
          <label className="accept" htmlFor="aceite">
            <input id="aceite" type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>{t("Li e aceito os")} <Link href="/termos" target="_blank">{t("Termos de Uso")}</Link> {t("e a")} <Link href="/privacidade" target="_blank">{t("Política de Privacidade")}</Link>.</span>
          </label>
        )}

        <a className="btn gbtn full" href={reg ? "/api/auth/google?aceite=1" : "/api/auth/google"} aria-disabled={googleOff} tabIndex={googleOff ? -1 : undefined} title={googleOff ? t("Aceite os Termos para continuar com o Google") : undefined}>
          <GoogleG />{t("Continuar com o Google")}
        </a>

        <div className="or"><span>{t("ou")}</span></div>

        {!open ? (
          <button type="button" className="ghost full" onClick={() => setOpen(true)} aria-expanded={false}><Icon name="mail" />{t("Continuar com o e-mail")}</button>
        ) : (
          <form onSubmit={go} className="gform">
            {reg && <div className="field"><label htmlFor="nome">{t("Nome")}</label><input id="nome" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={f.name} onChange={set("name")} /></div>}
            <div className="field"><label htmlFor="email">{t("E-mail")}</label><input id="email" type="email" required autoFocus autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" value={f.email} onChange={set("email")} /></div>
            <div className="field"><label htmlFor="senha">{t("Senha")}</label><PasswordInput id="senha" minLength={8} autoComplete={reg ? "new-password" : "current-password"} value={f.password} onChange={set("password")} />
              {reg ? <p className="small">{t("Mínimo de 8 caracteres.")}</p> : <p className="small"><Link href="/esqueci-senha">{t("Esqueci minha senha")}</Link></p>}</div>
            <button className="full" disabled={busy}>{reg ? t("Criar conta") : t("Entrar")}</button>
          </form>
        )}

        <p className="sw">{reg ? t("Já tem conta?") : t("Ainda não tem conta?")} <Link href={reg ? "/login" : "/cadastro"}>{reg ? t("Entrar") : t("Crie agora")}</Link></p>
        {!reg && <p className="legalnote">{t("Ao continuar, você concorda com os")} <Link href="/termos" target="_blank">{t("Termos de Uso")}</Link> {t("e a")} <Link href="/privacidade" target="_blank">{t("Política de Privacidade")}</Link>.</p>}
      </div>
    </>
  );
}
