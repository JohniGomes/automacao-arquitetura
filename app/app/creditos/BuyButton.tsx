"use client";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";

/** Inicia o pagamento no Mercado Pago. Os créditos só entram quando o pagamento é confirmado (webhook). */
export default function BuyButton({ id, interval, label, ghost = false }: { id: string; interval?: "mensal" | "anual"; label?: string; ghost?: boolean }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function go() {
    setMsg(""); setBusy(true);
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, interval }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { location.href = j.url; return; }
      setMsg(j.error || "Não foi possível iniciar o pagamento.");
    } catch {
      setMsg("Sem conexão. Verifique a internet e tente de novo.");
    }
    setBusy(false);
  }
  return (<>
    <button type="button" className={ghost ? "ghost" : ""} disabled={busy} aria-busy={busy} onClick={go}>{busy ? t("Abrindo o pagamento…") : t(label || "Comprar")}</button>
    {msg && <p className="alert err small" role="alert">{t(msg)}</p>}
  </>);
}
