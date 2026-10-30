"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

export default function Mapa() {
  const t = useT();
  const [address, setAddress] = useState("");
  const [zoom, setZoom] = useState(18);
  const [upload, setUpload] = useState<Val>(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const { gen, error, busy, submit } = useJob();

  return (
    <ToolShell
      title="Mapa de situação"
      tip="Dica: zoom 17 a 19 mostra bem o lote e as quadras vizinhas. Esta ferramenta não marca estabelecimentos: a IA não sabe onde eles existem de verdade."
      cost={COSTS.mapa}
      busy={busy}
      canGenerate={!!address.trim() || !!upload}
      onGenerate={() => submit({ type: "mapa", address, zoom: String(zoom), upload })}
      panel={<div className="field"><label htmlFor="z">{t("Zoom")}: {zoom}</label><input id="z" type="range" min={15} max={20} value={zoom} onChange={(e) => setZoom(+e.target.value)} /></div>}
      result={<Run gen={gen} error={error} />}
    >
      <div className="card">
        <div className="field"><label htmlFor="addr">{t("Endereço ou localização")}</label>
          <input id="addr" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("Ex.: Av. Paulista, 1000, São Paulo")} /></div>
        <button className="ghost" type="button" disabled={!address.trim()} onClick={() => setPreviewSrc(`/api/maps/preview?address=${encodeURIComponent(address)}&zoom=${zoom}`)}>{t("Pré-visualizar satélite")}</button>
        {previewSrc && (
          <div style={{ marginTop: 10 }}>
            <img className="preview" style={{ maxWidth: 360 }} src={previewSrc} alt={t("Satélite")} />
            <p className="attr">{t("Imagens © Google · Dados do mapa © Google e provedores. Uso sujeito aos Termos da Google Maps Platform.")}</p>
          </div>
        )}
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "18px 0" }} />
        <ImageInput label="Ou envie seu próprio print (substitui o endereço)" value={upload} onChange={setUpload} history={false} />
      </div>
    </ToolShell>
  );
}
