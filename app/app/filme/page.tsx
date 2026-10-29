"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { CENAS, REF_LABEL } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Filme() {
  const [project, setProject] = useState<Val>(null);
  const [refs, setRefs] = useState<{ interior: Val; fachada: Val; acesso: Val }>({ interior: null, fachada: null, acesso: null });
  const [cenas, setCenas] = useState<string[]>(["aerea", "fachada", "entardecer"]);
  const { gen, error, busy, submit } = useJob();
  const toggle = (k: string) => setCenas((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length < 5 ? [...c, k] : c));
  const cost = cenas.length * (COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena);
  const faltaInterior = cenas.includes("interior") && !refs.interior;

  return (
    <ToolShell
      title="Filme do projeto"
      tip="O filme leva alguns minutos. Você pode acompanhar o progresso nesta tela."
      cost={cost}
      busy={busy}
      canGenerate={!!project && cenas.length > 0 && !faltaInterior}
      onGenerate={() => submit({ type: "filme", project, cenas: cenas.join(","), interior: refs.interior, fachada: refs.fachada, acesso: refs.acesso })}
      panel={
        <div className="field"><label>Cenas (1 a 5, na ordem escolhida)</label>
          <div className="chips">{Object.entries(CENAS).map(([k, v]) => <button key={k} type="button" className={`chip ${cenas.includes(k) ? "on" : ""}`} aria-pressed={cenas.includes(k)} onClick={() => toggle(k)}>{cenas.includes(k) ? `${cenas.indexOf(k) + 1}. ` : ""}{v.label}</button>)}</div></div>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card">
        <ImageInput label="Imagem do projeto" value={project} onChange={setProject} />
        <ImageInput label={`${REF_LABEL.interior}${cenas.includes("interior") ? " (obrigatória para a cena Interior)" : " (opcional)"}`} value={refs.interior} onChange={(v) => setRefs((r) => ({ ...r, interior: v }))} history={false} />
        <ImageInput label={`${REF_LABEL.fachada} (opcional)`} value={refs.fachada} onChange={(v) => setRefs((r) => ({ ...r, fachada: v }))} history={false} />
        <ImageInput label={`${REF_LABEL.acesso} (opcional)`} value={refs.acesso} onChange={(v) => setRefs((r) => ({ ...r, acesso: v }))} history={false} />
        {faltaInterior && <p className="err small">A cena Interior precisa de uma imagem interior. Envie uma ou tire a cena da seleção.</p>}
      </div>
    </ToolShell>
  );
}
