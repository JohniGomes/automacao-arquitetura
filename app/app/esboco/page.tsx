"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { Seg, Versions } from "@/components/controls";
import ToolShell from "@/components/ToolShell";
import { Env, ESTILOS_ARQ } from "@/lib/compose";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

export default function Esboco() {
  const t = useT();
  const [sketch, setSketch] = useState<Val>(null);
  const [env, setEnv] = useState<Env>("exterior");
  const [estilo, setEstilo] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [versions, setVersions] = useState(1);
  const { gen, error, busy, submit } = useJob();

  return (
    <ToolShell
      title="Render de esboço"
      tip="Dica: traços firmes e perspectiva clara dão resultados mais fiéis ao desenho."
      cost={versions * COSTS.esbocoPorImagem}
      busy={busy}
      canGenerate={!!sketch}
      onGenerate={() => submit({ type: "esboco", sketch, env, estilo, detalhes, versions: String(versions) })}
      panel={
        <>
          <Seg label="Ambiente" value={env} onChange={setEnv} options={[{ v: "exterior", label: "Exterior" }, { v: "interior", label: "Interior" }]} />
          <div className="field"><label>{t("Estilo")}</label>
            <div className="chips">{ESTILOS_ARQ.map((s) => <button key={s} type="button" className={`chip ${estilo === s ? "on" : ""}`} aria-pressed={estilo === s} onClick={() => setEstilo(estilo === s ? "" : s)}>{t(s)}</button>)}</div></div>
          <Versions value={versions} onChange={setVersions} />
          <div className="field"><label htmlFor="dt">{t("Detalhes")}</label><textarea id="dt" className="short" maxLength={240} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} placeholder={t("Opcional. Materiais, cores, vegetação…")} />
            <p className="small muted" style={{ margin: "4px 2px 0", textAlign: "right" }}>{detalhes.length}/240</p></div>
        </>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card"><ImageInput label="Esboço ou desenho à mão" value={sketch} onChange={setSketch} /></div>
    </ToolShell>
  );
}
