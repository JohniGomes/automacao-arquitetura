"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import { LUZES } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";

export default function Luz() {
  const [base, setBase] = useState<Val>(null);
  const [luz, setLuz] = useState("golden");
  const [livre, setLivre] = useState("");
  const { gen, error, busy, submit } = useJob();
  return (
    <>
      <h1>Variação de iluminação</h1>
      <div className="card">
        <ImageInput label="Render de partida (envie ou escolha do histórico)" value={base} onChange={setBase} />
        <div className="field"><label>Iluminação</label>
          <div className="chips">{Object.entries(LUZES).map(([k, v]) => <span key={k} className={`chip ${!livre && luz === k ? "on" : ""}`} onClick={() => { setLuz(k); setLivre(""); }}>{v.label}</span>)}</div></div>
        <div className="field"><label>…ou descreva uma luz livre</label><input type="text" value={livre} onChange={(e) => setLivre(e.target.value)} placeholder="Ex.: luz amarela quente nos ambientes, céu azul" /></div>
        <p className="small muted">Custo: {COSTS.luz} créditos.</p>
        <button disabled={busy} onClick={() => submit({ type: "luz", base, luz, luzLivre: livre })}>Gerar variação</button>
      </div>
      <Run gen={gen} error={error} />
    </>
  );
}
