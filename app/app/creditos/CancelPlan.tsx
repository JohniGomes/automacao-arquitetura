"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";

/** Cancela a renovação do plano mensal (com confirmação). O plano vale até o fim do período já pago. */
export default function CancelPlan() {
  const t = useT();
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function go() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/billing/cancel", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error || "Não foi possível cancelar."); return; }
    router.refresh();
  }
  return (
    <div style={{ marginTop: 10 }}>
      {!ask ? <button type="button" className="ghost" onClick={() => setAsk(true)}>{t("Cancelar renovação")}</button> : (
        <div className="row gap" style={{ flexWrap: "wrap" }}>
          <span className="small">{t("Cancelar a renovação? O plano continua valendo até o fim do período pago.")}</span>
          <button type="button" disabled={busy} onClick={go}>{t("Sim, cancelar")}</button>
          <button type="button" className="ghost" onClick={() => setAsk(false)}>{t("Voltar")}</button>
        </div>
      )}
      {msg && <p className="alert err small" role="alert">{t(msg)}</p>}
    </div>
  );
}
