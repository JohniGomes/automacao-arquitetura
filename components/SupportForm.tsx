"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";

const SUBJECTS = [
  { v: "duvida", label: "Dúvida" },
  { v: "problema", label: "Problema técnico" },
  { v: "cobranca", label: "Cobrança e planos" },
  { v: "sugestao", label: "Sugestão" },
];

export default function SupportForm() {
  const t = useT();
  const [subject, setSubject] = useState("duvida");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || "Não foi possível enviar."); return; }
    setDone(true); setMessage("");
  }

  return (
    <div className="card">
      <h2>{t("Fale conosco")}</h2>
      {done ? (
        <>
          <p>{t("Mensagem enviada. Responderemos no e-mail da sua conta.")}</p>
          <button type="button" className="ghost" onClick={() => setDone(false)}>{t("Enviar outra mensagem")}</button>
        </>
      ) : (
        <>
          <div className="field"><label htmlFor="sj">{t("Assunto")}</label>
            <select id="sj" value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s.v} value={s.v}>{t(s.label)}</option>)}</select></div>
          <div className="field"><label htmlFor="sm">{t("Mensagem")}</label>
            <textarea id="sm" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("Descreva com o que você precisa de ajuda…")} /></div>
          {err && <p className="err">{t(err)}</p>}
          <button type="button" onClick={send} disabled={busy || message.trim().length < 10}>{busy ? t("Enviando…") : t("Enviar mensagem")}</button>
        </>
      )}
    </div>
  );
}
