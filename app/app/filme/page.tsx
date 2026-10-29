"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { CENAS } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Filme() {
  const [project, setProject] = useState<Val>(null);
  const [cenas, setCenas] = useState<string[]>(["aerea", "fachada", "entardecer"]);
  const { gen, error, busy, submit } = useJob();
  const toggle = (k: string) => setCenas((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length < 5 ? [...c, k] : c));
  const cost = cenas.length * (COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena);
  return (
    <>
      <h1>Filme do projeto</h1>
      <div className="card">
        <ImageInput label="Imagem do projeto" value={project} onChange={setProject} />
        <div className="field"><label>Cenas (1 a 5, na ordem em que foram escolhidas)</label>
          <div className="chips">{Object.entries(CENAS).map(([k, v]) => <span key={k} className={`chip ${cenas.includes(k) ? "on" : ""}`} onClick={() => toggle(k)}>{cenas.includes(k) ? `${cenas.indexOf(k) + 1}. ` : ""}{v.label}</span>)}</div></div>
        <p className="small muted">Custo: {cost} créditos ({cenas.length} cena(s)).</p>
        <button disabled={busy || !cenas.length} onClick={() => submit({ type: "filme", project, cenas: cenas.join(",") })}>Gerar filme</button>
      </div>
      <Run gen={gen} error={error} />
    </>
  );
}
