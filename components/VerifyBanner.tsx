"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";

/** Aviso para quem ainda não confirmou o e-mail: sem confirmar, não gera nem compra. */
export default function VerifyBanner({ email }: { email: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "err">("idle");
  async function resend() {
    setState("busy");
    const r = await fetch("/api/auth/email/send", { method: "POST" });
    setState(r.ok ? "sent" : "err");
  }
  return (
    <div className="card" role="status" style={{ margin: "0 0 18px", padding: "14px 20px" }}>
      <strong>{t("Confirme seu e-mail para liberar o app.")}</strong>{" "}
      <span className="muted">{t("Enviamos um link para")} {email}. {t("Seus créditos de boas-vindas entram assim que você confirmar.")}</span>{" "}
      {state === "sent" ? <span>{t("Link reenviado.")}</span> : (
        <button className="ghost" type="button" disabled={state === "busy"} onClick={resend}>{state === "err" ? t("Não foi possível enviar. Tentar de novo") : t("Reenviar e-mail")}</button>
      )}
    </div>
  );
}
