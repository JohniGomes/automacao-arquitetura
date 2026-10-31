"use client";
import { useId, useState } from "react";
import { useT } from "@/components/I18nProvider";

/** Inicia o pagamento no Asaas. Na primeira compra pede o CPF ou CNPJ (o Asaas exige para emitir a cobrança). */
export default function BuyButton({ id, label, needsCpf = false, ghost = false }: { id: string; label?: string; needsCpf?: boolean; ghost?: boolean }) {
  const t = useT();
  const fid = useId();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [cpf, setCpf] = useState("");
  async function go() {
    setMsg(""); setBusy(true);
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, cpfCnpj: cpf }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { location.href = j.url; return; }
      setMsg(j.error || "Não foi possível iniciar o pagamento.");
    } catch {
      setMsg("Sem conexão. Verifique a internet e tente de novo.");
    }
    setBusy(false);
  }
  return (<>
    {needsCpf && (
      <div className="field" style={{ margin: "8px 0" }}>
        <label htmlFor={fid}>{t("CPF ou CNPJ")}</label>
        <input id={fid} type="text" inputMode="numeric" autoComplete="off" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" maxLength={18} />
      </div>
    )}
    <button type="button" className={ghost ? "ghost" : ""} disabled={busy || (needsCpf && cpf.replace(/\D/g, "").length < 11)} aria-busy={busy} onClick={go}>{busy ? t("Abrindo o pagamento…") : t(label || "Comprar")}</button>
    {msg && <p className="alert err small" role="alert">{t(msg)}</p>}
  </>);
}
