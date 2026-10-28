"use client";
import { useEffect, useState } from "react";
import { Disclaimer, ImageInput, Run, useJob, Val } from "@/components/client";
import { AMBIENTES } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Moodboard() {
  const [templates, setTemplates] = useState<{ file: string; name: string }[]>([]);
  const [tpl, setTpl] = useState<string>("");
  const [custom, setCustom] = useState<Val>(null);
  const [amb, setAmb] = useState("cozinha");
  const [house, setHouse] = useState<Val>(null);
  const { gen, error, busy, submit } = useJob();

  useEffect(() => { fetch("/api/templates").then((r) => r.json()).then((j) => setTemplates(j.templates)); }, []);
  const template: Val = custom || (tpl ? "tpl:" + tpl : null);

  return (
    <>
      <h1>Moodboard por ambiente</h1>
      <p className="muted">O modelo define só o formato (flat lay vertical com 4 cores em pílula); o conteúdo é gerado a partir do ambiente e da casa de referência.</p>
      <div className="card">
        <div className="field"><label>1. Modelo da galeria</label>
          {templates.length === 0 ? <p className="muted">Nenhum modelo cadastrado. Adicione imagens em <code>templates/moodboards/</code> ou envie um print abaixo.</p> :
            <div className="thumbs">{templates.map((t) => (
              <img key={t.file} className={tpl === t.file && !custom ? "sel" : ""} style={{ height: 140 }} src={`/api/templates?img=${encodeURIComponent(t.file)}`} alt={t.name} title={t.name} onClick={() => { setTpl(t.file); setCustom(null); }} />
            ))}</div>}
          <ImageInput label="…ou envie um print do Pinterest como modelo" value={custom} onChange={setCustom} history={false} />
        </div>
        <div className="field"><label>2. Ambiente</label>
          <div className="chips">{Object.entries(AMBIENTES).map(([k, v]) => <span key={k} className={`chip ${amb === k ? "on" : ""}`} onClick={() => setAmb(k)}>{v.label}</span>)}</div></div>
        <ImageInput label="3. Imagem da casa de referência (render do projeto)" value={house} onChange={setHouse} />
        <p className="small muted">Custo: {COSTS.moodboard} créditos.</p>
        <button disabled={busy} onClick={() => submit({ type: "moodboard", ambiente: amb, house, template })}>Gerar moodboard</button>
        <Disclaimer />
      </div>
      <Run gen={gen} error={error} />
    </>
  );
}
