"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCredits } from "./useCredits";
import ProjectSelect from "./ProjectSelect";
import { useT } from "./I18nProvider";

/**
 * Padrão das ferramentas: área de trabalho à esquerda (envio da imagem e resultados) e,
 * à direita, o painel de opções com o projeto, o custo em tempo real e o botão de gerar.
 */
export default function ToolShell({ title, tip, panel, cost, busy, canGenerate = true, onGenerate, children, result }: {
  title: string; tip?: string; panel?: React.ReactNode; cost: number; busy: boolean; canGenerate?: boolean;
  onGenerate: () => void; children: React.ReactNode; result?: React.ReactNode;
}) {
  const saldo = useCredits();
  const t = useT();
  const resRef = useRef<HTMLDivElement>(null);
  // no celular, ao gerar, a tela desce até o andamento e o resultado
  // ao terminar, desce de novo para o começo do resultado (a imagem só ocupa espaço depois de pronta)
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy && window.matchMedia("(max-width: 860px)").matches) {
      // duas vezes: as imagens só ocupam o espaço final depois de carregadas
      const ids = [250, 1200].map((ms) => setTimeout(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), ms));
      wasBusy.current = false;
      return () => ids.forEach(clearTimeout);
    }
    wasBusy.current = busy;
  }, [busy]);
  useEffect(() => {
    if (!busy || !window.matchMedia("(max-width: 860px)").matches) return;
    // o andamento só aparece depois da primeira resposta do servidor: tenta por alguns segundos
    let n = 0;
    const id = setInterval(() => {
      const el = resRef.current;
      if (el && el.offsetHeight > 0) { el.scrollIntoView({ behavior: "smooth", block: "start" }); clearInterval(id); } else if (++n > 15) clearInterval(id);
    }, 400);
    return () => clearInterval(id);
  }, [busy]);
  return (
    <>
      <div className="thead">
        <h1>{t(title)}</h1>
        <Link href="/app/creditos" className="chipcredits" title={t("Créditos")}><b>{saldo ?? "…"}</b> {t("créditos")}</Link>
      </div>
      <div className="tool">
        <div className="tmain">
          {children}
          {tip && <p className="tip">{t(tip)}</p>}
        </div>
        <aside className="tpanel" aria-label={t("Opções")}>
          <div className="tpbody">
            {panel}
            <ProjectSelect />
          </div>
          <div className="tpfoot">
            <div className="tcost"><span>{t("Custo total")}</span><b>{cost} {t("créditos")}</b></div>
            <button className="full" disabled={busy || !canGenerate} aria-busy={busy} onClick={onGenerate}>{busy ? t("Gerando…") : t("Gerar")}</button>
            {!busy && !canGenerate && <p className="small muted" style={{ margin: "8px 2px 0", textAlign: "center" }}>{t("Preencha o que falta para gerar.")}</p>}
          </div>
        </aside>
        {result && <div className="tresult" ref={resRef}>{result}</div>}
      </div>
    </>
  );
}
