"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { PROMPT_RENDER } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Render() {
  const [model, setModel] = useState<Val>(null);
  const [prompt, setPrompt] = useState(PROMPT_RENDER);
  const { gen, error, busy, submit } = useJob();
  return (
    <>
      <h1>Render a partir de print</h1>
      <div className="card">
        <ImageInput label="Print do modelo 3D" value={model} onChange={setModel} />
        <div className="field"><label>Prompt (edite à vontade)</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button type="button" className="ghost" onClick={() => setPrompt(PROMPT_RENDER)}>Restaurar padrão</button></div>
        <p className="small muted">Custo: {COSTS.renderPorImagem * 4} créditos (4 versões).</p>
        <button disabled={busy} onClick={() => submit({ type: "render", model, prompt })}>Gerar 4 versões</button>
      </div>
      <Run gen={gen} error={error} />
    </>
  );
}
