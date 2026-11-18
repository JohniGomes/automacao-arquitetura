"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";

/** Campo do código do VDO Club. */
export default function PromoCode({ inicial, creditos, dias }: { inicial?: string; creditos: number; dias: number }) {
  const t = useT();
  const router = useRouter();
  const [codigo, setCodigo] = useState(inicial || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "Não foi possível usar o código agora. Tente de novo.");
      else { setOk(true); window.dispatchEvent(new Event("credits-changed")); router.refresh(); }
    } catch { setMsg("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
  }
  return (
    <div className="card"><h2>{t("Código do VDO Club")}</h2>
      <p className="small muted">{t("Membros do VDO Club ganham o plano Max e créditos grátis.")} ({creditos} {t("créditos")} · {dias} {t("dias")})</p>
      {ok ? <p className="small" role="status">{t("Código aplicado! Seu plano Max e os créditos já estão na conta.")}</p> : (
        <form onSubmit={go} className="row gap" style={{ flexWrap: "wrap" }}>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder={t("Digite o código")} aria-label={t("Código do VDO Club")} autoCapitalize="characters" style={{ flex: "1 1 180px" }} />
          <button type="submit" disabled={busy || !codigo.trim()}>{t("Usar código")}</button>
        </form>
      )}
      {msg && <p className="alert err small" role="alert">{t(msg)}</p>}
    </div>
  );
}
