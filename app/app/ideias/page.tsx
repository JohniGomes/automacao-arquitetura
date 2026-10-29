"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { Seg, Versions } from "@/components/controls";
import ToolShell from "@/components/ToolShell";
import { Env, ESTILOS_ARQ, TIPOS_IDEIA } from "@/lib/compose";
import { COSTS } from "@/lib/costs";

export default function Ideias() {
  const [base, setBase] = useState<Val>(null);
  const [reference, setReference] = useState<Val>(null);
  const [env, setEnv] = useState<Env>("exterior");
  const [tipo, setTipo] = useState<string>(TIPOS_IDEIA.exterior[0]);
  const [estilo, setEstilo] = useState<string>(ESTILOS_ARQ[0]);
  const [detalhes, setDetalhes] = useState("");
  const [versions, setVersions] = useState(2);
  const { gen, error, busy, submit } = useJob();

  const changeEnv = (e: Env) => { setEnv(e); setTipo(TIPOS_IDEIA[e][0]); };

  return (
    <ToolShell
      title="Gerar ideias"
      tip="Dica: parta de um render ou foto com a câmera que você quer manter."
      cost={versions * COSTS.ideiasPorImagem}
      busy={busy}
      canGenerate={!!base}
      onGenerate={() => submit({ type: "ideias", base, reference, env, tipo, estilo, detalhes, versions: String(versions) })}
      panel={
        <>
          <Seg label="Ambiente" value={env} onChange={changeEnv} options={[{ v: "exterior", label: "Exterior" }, { v: "interior", label: "Interior" }]} />
          <div className="field"><label>O que variar</label>
            <div className="chips">{TIPOS_IDEIA[env].map((t) => <button key={t} type="button" className={`chip ${tipo === t ? "on" : ""}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t}</button>)}</div></div>
          <div className="field"><label>Estilo</label>
            <div className="chips">{ESTILOS_ARQ.map((s) => <button key={s} type="button" className={`chip ${estilo === s ? "on" : ""}`} aria-pressed={estilo === s} onClick={() => setEstilo(s)}>{s}</button>)}</div></div>
          <Versions value={versions} onChange={setVersions} />
          <div className="field"><label htmlFor="dt">Detalhes</label><textarea id="dt" className="short" maxLength={240} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} placeholder="Opcional" />
            <p className="small muted" style={{ margin: "4px 2px 0", textAlign: "right" }}>{detalhes.length}/240</p></div>
          <ImageInput label="Imagem de inspiração (opcional)" value={reference} onChange={setReference} history={false} />
        </>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card"><ImageInput label="Imagem de partida" value={base} onChange={setBase} /></div>
    </ToolShell>
  );
}
