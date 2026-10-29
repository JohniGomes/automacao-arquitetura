"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { Fold, Seg, Slider, useSavedScenes, Versions } from "@/components/controls";
import ToolShell from "@/components/ToolShell";
import { CENAS_LUZ, ELEMENTOS, EstiloKey, ESTILOS, Env, NIVEIS } from "@/lib/compose";
import { renderCost } from "@/lib/costs";

export default function Render() {
  const [model, setModel] = useState<Val>(null);
  const [style, setStyle] = useState<EstiloKey>("realista");
  const [mode, setMode] = useState<"rapido" | "precisao">("rapido");
  const [level, setLevel] = useState(1);
  const [versions, setVersions] = useState(1);
  const [env, setEnv] = useState<Env>("exterior");
  const [guidance, setGuidance] = useState("");
  const [adv, setAdv] = useState(false);
  const [reference, setReference] = useState<Val>(null);
  const [scene, setScene] = useState("");
  const [sceneFree, setSceneFree] = useState("");
  const [elements, setElements] = useState<string[]>([]);
  const [saveName, setSaveName] = useState("");
  const saved = useSavedScenes();
  const { gen, error, busy, submit } = useJob();

  const toggleEl = (id: string) => setElements((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  return (
    <ToolShell
      title="Render a partir de print"
      tip="Dica: use um print nítido, com câmera ampla e materiais já aplicados no modelo."
      cost={renderCost(mode, versions)}
      busy={busy}
      canGenerate={!!model}
      onGenerate={() => submit({ type: "render", model, reference, mode, versions: String(versions), style, level: String(level), env, guidance, scene, sceneFree, elements: elements.join(",") })}
      panel={
        <>
          <Seg label="Resultado" value={style} onChange={setStyle} options={(Object.keys(ESTILOS) as EstiloKey[]).map((k) => ({ v: k, label: ESTILOS[k].label, desc: ESTILOS[k].desc }))} />
          <Seg label="Ambiente" value={env} onChange={setEnv} options={[{ v: "exterior", label: "Exterior" }, { v: "interior", label: "Interior" }]} />
          <Seg label="Modo" value={mode} onChange={setMode} options={[{ v: "rapido", label: "Rápido", desc: "Ideal para explorar ideias." }, { v: "precisao", label: "Precisão", desc: "Imagem em maior resolução, mais fiel aos detalhes." }]} />
          <Slider label="Nível" value={level} onChange={setLevel} min={0} max={2} left="Leve" right="Ultra" valueLabel={NIVEIS[level].label} />
          <Versions value={versions} onChange={setVersions} />
          <div className="field"><label htmlFor="gd">Orientação adicional</label><textarea id="gd" className="short" value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder="Opcional. Ex.: piso de madeira clara, parede de tijolo aparente" /></div>

          <Fold title="Opções avançadas" open={adv} onToggle={() => setAdv(!adv)}>
            <ImageInput label="Imagem de referência (luz e atmosfera)" value={reference} onChange={setReference} history={false} />
            <div className="field"><label>Luz e clima</label>
              <div className="scenes">
                <button type="button" className={`scene ${!scene && !sceneFree ? "on" : ""}`} aria-pressed={!scene && !sceneFree} onClick={() => { setScene(""); setSceneFree(""); }}><i style={{ background: "var(--field)" }} />Padrão</button>
                {CENAS_LUZ.map((s) => <button key={s.id} type="button" className={`scene ${scene === s.id && !sceneFree ? "on" : ""}`} aria-pressed={scene === s.id && !sceneFree} onClick={() => { setScene(s.id); setSceneFree(""); }}><i style={{ background: s.swatch }} />{s.label}{s.kind === "clima" && <small className="kind">clima</small>}</button>)}
              </div>
              {saved.list.length > 0 && (
                <div className="chips" style={{ marginTop: 10 }}>
                  {saved.list.map((s) => (
                    <span key={s.id} className="chip savedchip">
                      <button type="button" onClick={() => { setScene(s.scene); setSceneFree(s.sceneFree); setElements(s.elements); }}>{s.name}</button>
                      <button type="button" aria-label={`Remover cena ${s.name}`} onClick={() => saved.remove(s.id)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="field"><label htmlFor="sf">Ou descreva a luz</label><input id="sf" type="text" value={sceneFree} onChange={(e) => setSceneFree(e.target.value)} placeholder="Ex.: luz quente nos ambientes, céu azul" /></div>
            <div className="field"><label>Elementos para adicionar</label>
              <div className="chips">{ELEMENTOS.map((e) => <button key={e.id} type="button" className={`chip ${elements.includes(e.id) ? "on" : ""}`} aria-pressed={elements.includes(e.id)} onClick={() => toggleEl(e.id)}>{e.label}</button>)}</div></div>
            <div className="field"><label htmlFor="sn">Salvar esta luz e estes elementos como cena</label>
              <div className="row gap" style={{ flexWrap: "nowrap" }}>
                <input id="sn" type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Nome da cena" />
                <button type="button" className="ghost" disabled={!saveName.trim() || (!scene && !sceneFree && elements.length === 0)} onClick={() => { saved.add({ name: saveName.trim().slice(0, 30), scene, sceneFree, elements }); setSaveName(""); }}>Salvar</button>
              </div></div>
          </Fold>
        </>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card"><ImageInput label="Print do modelo 3D" value={model} onChange={setModel} /></div>
    </ToolShell>
  );
}
