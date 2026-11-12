"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";
import { useT } from "./I18nProvider";

/** Formulários de recuperação: "forgot" pede o link por e-mail; "reset" define a nova senha com o token do link. */
export default function MailForm({ mode, token }: { mode: "forgot" | "reset"; token?: string }) {
  const t = useT();
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const forgot = mode === "forgot";

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch(`/api/auth/email/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(forgot ? { email: v } : { token, password: v }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) setDone(true); else setErr(t(j.error || "Erro. Tente novamente."));
  }

  return (
    <form className="box" onSubmit={go}>
      <Link href="/" className="brand"><Logo />ArqIA</Link>
      <h1>{forgot ? t("Esqueci minha senha") : t("Criar nova senha")}</h1>
      {done ? (
        <>
          <p className="muted">{forgot ? t("Se este e-mail tiver uma conta com senha, enviamos um link para redefinir. Confira também o spam.") : t("Senha alterada! Já pode entrar com a nova senha.")}</p>
          <p style={{ marginTop: 20 }}><Link className="btn full" href="/login">{t("Entrar")}</Link></p>
        </>
      ) : (
        <>
          {forgot && <p className="muted">{t("Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.")}</p>}
          <div className="field">
            <label htmlFor="v">{forgot ? t("E-mail") : t("Nova senha")}</label>
            <input id="v" type={forgot ? "email" : "password"} required minLength={forgot ? undefined : 8} autoComplete={forgot ? "email" : "new-password"} value={v} onChange={(e) => setV(e.target.value)} />
            {!forgot && <p className="small muted">{t("Mínimo de 8 caracteres.")}</p>}
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="full" disabled={busy}>{forgot ? t("Enviar link") : t("Salvar nova senha")}</button>
          <p className="sw"><Link href="/login">{t("Voltar para o login")}</Link></p>
        </>
      )}
    </form>
  );
}
