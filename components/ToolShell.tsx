"use client";
import Link from "next/link";
import { useCredits } from "./useCredits";
import ProjectSelect from "./ProjectSelect";

/**
 * Padrão das ferramentas: área de trabalho à esquerda (envio da imagem e resultados) e,
 * à direita, o painel de opções com o projeto, o custo em tempo real e o botão de gerar.
 */
export default function ToolShell({ title, tip, panel, cost, busy, canGenerate = true, onGenerate, children, result }: {
  title: string; tip?: string; panel?: React.ReactNode; cost: number; busy: boolean; canGenerate?: boolean;
  onGenerate: () => void; children: React.ReactNode; result?: React.ReactNode;
}) {
  const saldo = useCredits();
  return (
    <>
      <div className="thead">
        <h1>{title}</h1>
        <Link href="/app/creditos" className="chipcredits" title="Créditos"><b>{saldo ?? "…"}</b> créditos</Link>
      </div>
      <div className="tool">
        <div className="tmain">
          {children}
          {tip && <p className="tip">{tip}</p>}
        </div>
        <aside className="tpanel" aria-label="Opções">
          {panel}
          <ProjectSelect />
          <div className="tcost"><span>Custo total</span><b>{cost} créditos</b></div>
          <button className="full" disabled={busy || !canGenerate} onClick={onGenerate}>{busy ? "Gerando…" : "Gerar"}</button>
        </aside>
        {result && <div className="tresult">{result}</div>}
      </div>
    </>
  );
}
