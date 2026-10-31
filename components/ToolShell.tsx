"use client";
import Link from "next/link";
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
            {!busy && !canGenerate && <p className="small muted" style={{ margin: "8px 2px 0", textAlign: "center" }}>{t("Preencha o que falta à esquerda para gerar.")}</p>}
          </div>
        </aside>
        {result && <div className="tresult">{result}</div>}
      </div>
    </>
  );
}
