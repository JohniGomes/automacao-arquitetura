"use client";
import { useState } from "react";
import { Disclaimer, ImageInput, Run, useJob, Val } from "@/components/client";
import { PROMPT_RENDER } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Render() {
  const [model, setModel] = useState<Val>(null);
  const [prompt, setPrompt] = useState(PROMPT_RENDER);
  const { gen, error, busy, submit } = useJob();
  return (
    <>
      <h1>Render a partir de print</h1>
      <p className="muted">Suba o print do modelo 3D (SketchUp, Revit, etc.). Geramos 4 versões fotorrealistas. A fidelidade da geometria não é garantida: compare sempre com o modelo.</p>
      <div className="card">
        <ImageInput label="Print do modelo 3D" value={model} onChange={setModel} />
        <div className="field"><label>Prompt (edite à vontade)</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button type="button" className="ghost" onClick={() => setPrompt(PROMPT_RENDER)}>Restaurar padrão</button></div>
        <p className="small muted">Custo: {COSTS.renderPorImagem * 4} créditos (4 versões).</p>
        <button disabled={busy} onClick={() => submit({ type: "render", model, prompt })}>Gerar 4 versões</button>
        <Disclaimer />
      </div>
      <Run gen={gen} error={error} />
    </>
  );
}
