"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { PROMPT_RENDER } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Render() {
  const [model, setModel] = useState<Val>(null);
  const [prompt, setPrompt] = useState(PROMPT_RENDER);
  const { gen, error, busy, submit } = useJob();

  return (
    <ToolShell
      title="Render a partir de print"
      tip="Dica: use um print nítido, com câmera ampla e materiais já aplicados no modelo."
      cost={COSTS.renderPorImagem * 4}
      busy={busy}
      canGenerate={!!model}
      onGenerate={() => submit({ type: "render", model, prompt })}
      panel={
        <div className="field">
          <label htmlFor="pr">Prompt</label>
          <textarea id="pr" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => setPrompt(PROMPT_RENDER)}>Restaurar padrão</button>
        </div>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card"><ImageInput label="Print do modelo 3D" value={model} onChange={setModel} /></div>
    </ToolShell>
  );
}
