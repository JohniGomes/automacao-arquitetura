"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { Slider, Versions } from "@/components/controls";
import ToolShell from "@/components/ToolShell";
import { MELHORIAS, MelhoriaKey } from "@/lib/compose";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

export default function Melhorar() {
  const t = useT();
  const [render, setRender] = useState<Val>(null);
  const [preset, setPreset] = useState<MelhoriaKey>("fidelidade");
  const [creativity, setCreativity] = useState(30);
  const [versions, setVersions] = useState(1);
  const [guidance, setGuidance] = useState("");
  const { gen, error, busy, submit, cancel } = useJob();

  return (
    <ToolShell
      title="Melhorar render"
      tip="Dica: use a imagem na maior resolução que você tiver, sem borrões."
      cost={versions * COSTS.melhorarPorImagem}
      busy={busy}
      canGenerate={!!render}
      onGenerate={() => submit({ type: "melhorar", render, preset, creativity: String(creativity), versions: String(versions), guidance })}
      panel={
        <>
          <div className="field"><label>{t("Melhoria")}</label>
            <div className="presets" role="group" aria-label={t("Melhoria")}>
              {(Object.keys(MELHORIAS) as MelhoriaKey[]).map((k) => (
                <button key={k} type="button" className={`preset ${preset === k ? "on" : ""}`} aria-pressed={preset === k} onClick={() => setPreset(k)}>
                  <b>{t(MELHORIAS[k].label)}</b><span>{t(MELHORIAS[k].desc)}</span>
                </button>
              ))}
            </div></div>
          <Slider label="Liberdade" value={creativity} onChange={setCreativity} min={0} max={100} step={5} left="Fidelidade" right="Criatividade" />
          <Versions value={versions} onChange={setVersions} />
          <div className="field"><label htmlFor="gd">{t("Orientação adicional")}</label><textarea id="gd" className="short" value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder={t("Opcional")} /></div>
        </>
      }
      result={<Run gen={gen} error={error} onCancel={cancel} />}
    >
      <div className="card"><ImageInput label="Render a melhorar (de qualquer programa)" value={render} onChange={setRender} /></div>
    </ToolShell>
  );
}
