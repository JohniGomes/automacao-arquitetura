"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { Seg, Slider } from "@/components/controls";
import OrbitDial from "@/components/OrbitDial";
import ToolShell from "@/components/ToolShell";
import { angleLabel, ANGULOS, LENTES, LenteKey } from "@/lib/compose";
import { COSTS_EDICAO } from "@/lib/costs";

export default function Angulos() {
  const [base, setBase] = useState<Val>(null);
  const [mode, setMode] = useState<"unica" | "mosaico">("unica");
  const [how, setHow] = useState<"pre" | "manual">("pre");
  const [single, setSingle] = useState<string>("d45");
  const [multi, setMulti] = useState<string[]>(["e45", "d45", "topo"]);
  const [az, setAz] = useState(45);
  const [el, setEl] = useState(0);
  const [lens, setLens] = useState<LenteKey>("normal");
  const { gen, error, busy, submit } = useJob();

  const manual = mode === "unica" && how === "manual";
  const count = mode === "mosaico" ? multi.length : 1;
  const toggleMulti = (id: string) => setMulti((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length < 6 ? [...m, id] : m));

  const generate = () => submit({
    type: "angulos", base, lens, mode,
    ...(manual ? { az: String(az), el: String(el) } : { angles: (mode === "mosaico" ? multi : [single]).join(",") }),
  });

  return (
    <ToolShell
      title="Multi-ângulo"
      tip="Beta: os lados que não aparecem na imagem são inferidos pela IA e não representam o projeto com precisão. Para vistas fiéis, use o modelo 3D."
      cost={count * COSTS_EDICAO.anguloPorImagem}
      busy={busy}
      canGenerate={!!base && (mode === "unica" || multi.length >= 2)}
      onGenerate={generate}
      panel={
        <>
          <Seg label="Resultado" value={mode} onChange={setMode} options={[{ v: "unica", label: "Imagem única" }, { v: "mosaico", label: "Mosaico", desc: "Vários ângulos e uma imagem com todos." }]} />
          {mode === "unica" && <Seg label="Ângulo" value={how} onChange={setHow} options={[{ v: "pre", label: "Predefinido" }, { v: "manual", label: "Manual" }]} />}
          {mode === "unica" && how === "pre" && (
            <div className="field"><div className="chips">{ANGULOS.map((a) => <button key={a.id} type="button" className={`chip ${single === a.id ? "on" : ""}`} aria-pressed={single === a.id} onClick={() => setSingle(a.id)}>{a.label}</button>)}</div></div>
          )}
          {mode === "mosaico" && (
            <div className="field"><label>Ângulos (2 a 6)</label><div className="chips">{ANGULOS.map((a) => <button key={a.id} type="button" className={`chip ${multi.includes(a.id) ? "on" : ""}`} aria-pressed={multi.includes(a.id)} onClick={() => toggleMulti(a.id)}>{a.label}</button>)}</div></div>
          )}
          {manual && (
            <>
              <div className="field"><label>Giro da câmera: {angleLabel(az, 0)}</label><OrbitDial value={az} onChange={setAz} /></div>
              <Slider label="Altura" value={el} onChange={setEl} min={-35} max={85} step={5} left="De baixo" right="De cima" valueLabel={angleLabel(0, el)} />
            </>
          )}
          <Seg label="Lente" value={lens} onChange={setLens} options={(Object.keys(LENTES) as LenteKey[]).map((k) => ({ v: k, label: LENTES[k].label }))} />
        </>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card"><ImageInput label="Imagem de partida (render ou foto)" value={base} onChange={setBase} /></div>
    </ToolShell>
  );
}
