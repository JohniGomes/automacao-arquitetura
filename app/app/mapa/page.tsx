"use client";
import { useState } from "react";
import { Disclaimer, ImageInput, Run, useJob, Val } from "@/components/client";
import { COSTS } from "@/lib/costs";

export default function Mapa() {
  const [address, setAddress] = useState("");
  const [zoom, setZoom] = useState(18);
  const [upload, setUpload] = useState<Val>(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const { gen, error, busy, submit } = useJob();

  return (
    <>
      <h1>Mapa de situação</h1>
      <p className="muted">Digite o endereço: buscamos a imagem de satélite (Google Maps Platform) e a IA gera o mapa com os pontos de interesse. Ou envie o seu próprio print.</p>
      <div className="card">
        <div className="field"><label>Endereço ou localização</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex.: Av. Paulista, 1000, São Paulo" /></div>
        <div className="field"><label>Zoom: {zoom}</label><input type="range" min={15} max={20} value={zoom} onChange={(e) => setZoom(+e.target.value)} /></div>
        <button className="ghost" disabled={!address} onClick={() => setPreviewSrc(`/api/maps/preview?address=${encodeURIComponent(address)}&zoom=${zoom}`)}>Pré-visualizar satélite</button>
        {previewSrc && (<div style={{ marginTop: 10 }}>
          <img className="preview" style={{ maxWidth: 360 }} src={previewSrc} alt="Satélite" />
          <p className="attr">Imagens © Google · Dados do mapa © Google e provedores. Uso sujeito aos Termos da Google Maps Platform.</p></div>)}
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "18px 0" }} />
        <ImageInput label="Ou envie seu próprio print (substitui o endereço)" value={upload} onChange={setUpload} history={false} />
        <p className="small muted">Custo: {COSTS.mapa} créditos. A busca no Maps é feita no servidor ao gerar.</p>
        <button disabled={busy} onClick={() => submit({ type: "mapa", address, zoom: String(zoom), upload })}>Gerar mapa de situação</button>
        <Disclaimer />
      </div>
      <Run gen={gen} error={error} />
    </>
  );
}
