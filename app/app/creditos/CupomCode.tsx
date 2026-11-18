"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";

/** Campo "Cupom de desconto" da página de créditos (para quem entrou sem cupom, por exemplo pelo Google). */
export default function CupomCode({ inicial }: { inicial?: string }) {
  const t = useT();
  const router = useRouter();
  const [cupom, setCupom] = useState(inicial || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/cupom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cupom }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "Não foi possível usar o cupom agora. Tente de novo.");
      else { setOk(true); window.dispatchEvent(new Event("credits-changed")); router.refresh(); }
    } catch { setMsg("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
  }
  return (
    <div className="card"><h2>{t("Cupom de desconto")}</h2>
      {ok ? <p className="small" role="status">{t("Cupom aplicado! Seu plano e os créditos já estão na conta.")}</p> : (
        <form onSubmit={go} className="row gap" style={{ flexWrap: "wrap" }}>
          <input value={cupom} onChange={(e) => setCupom(e.target.value)} placeholder={t("Digite o cupom")} aria-label={t("Cupom de desconto")} autoCapitalize="characters" autoComplete="off" style={{ flex: "1 1 180px" }} />
          <button type="submit" disabled={busy || !cupom.trim()}>{t("Usar cupom")}</button>
        </form>
      )}
      {msg && <p className="alert err small" role="alert">{t(msg)}</p>}
    </div>
  );
}
