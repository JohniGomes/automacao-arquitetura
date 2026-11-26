"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { PADROES_MEMORIAL, TIPOS_MEMORIAL } from "@/lib/memorialOpcoes";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

export default function Memorial() {
  const t = useT();
  const [foto, setFoto] = useState<Val>(null);
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [tipo, setTipo] = useState("");
  const [area, setArea] = useState("");
  const [padrao, setPadrao] = useState("");
  const [notas, setNotas] = useState("");
  const { gen, error, busy, submit, cancel } = useJob();

  return (
    <ToolShell
      title="Memorial descritivo"
      tip="Envie a foto ou o render do projeto. Os campos abaixo são opcionais, mas deixam o memorial mais fiel."
      cost={COSTS.memorial}
      busy={busy}
      canGenerate={!!foto}
      onGenerate={() => submit({ type: "memorial", foto, nome, local, tipo, area, padrao, notas })}
      panel={
        <>
          <div className="field"><label htmlFor="mn">{t("Nome do projeto")}</label><input id="mn" type="text" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("Ex.: Casa Entre Planos")} /></div>
          <div className="field"><label htmlFor="ml">{t("Localização")}</label><input id="ml" type="text" maxLength={120} value={local} onChange={(e) => setLocal(e.target.value)} placeholder={t("Ex.: Campinas, SP")} /></div>
          <div className="field"><label>{t("Tipo de edificação")}</label>
            <div className="chips">{TIPOS_MEMORIAL.map((x) => <button key={x} type="button" className={`chip ${tipo === x ? "on" : ""}`} aria-pressed={tipo === x} onClick={() => setTipo(tipo === x ? "" : x)}>{t(x)}</button>)}</div></div>
          <div className="field"><label htmlFor="ma">{t("Área construída aproximada (m²)")}</label><input id="ma" type="text" inputMode="decimal" maxLength={10} value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("Opcional")} /></div>
          <div className="field"><label>{t("Padrão de acabamento")}</label>
            <div className="chips">{PADROES_MEMORIAL.map((x) => <button key={x} type="button" className={`chip ${padrao === x ? "on" : ""}`} aria-pressed={padrao === x} onClick={() => setPadrao(padrao === x ? "" : x)}>{t(x)}</button>)}</div></div>
          <div className="field"><label htmlFor="mo">{t("Observações")}</label><textarea id="mo" className="short" maxLength={600} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder={t("Ex.: estrutura em concreto aparente, esquadrias em alumínio preto…")} />
            <p className="small muted" style={{ margin: "4px 2px 0", textAlign: "right" }}>{notas.length}/600</p></div>
        </>
      }
      result={<Run gen={gen} error={error} onCancel={cancel} />}
    >
      <div className="card"><ImageInput label="Foto ou render do projeto" value={foto} onChange={setFoto} /></div>
    </ToolShell>
  );
}
