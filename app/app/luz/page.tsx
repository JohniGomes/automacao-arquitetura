"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { LUZES } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

export default function Luz() {
  const t = useT();
  const [base, setBase] = useState<Val>(null);
  const [luz, setLuz] = useState("golden");
  const [livre, setLivre] = useState("");

  const { gen, error, busy, submit, cancel } = useJob();
  return (
    <ToolShell
      title="Variação de iluminação"
      cost={COSTS.luz}
      busy={busy}
      canGenerate={!!base}
      onGenerate={() => submit({ type: "luz", base, luz, luzLivre: livre })}
      panel={
        <>
          <div className="field"><label>{t("Iluminação")}</label>
            <div className="chips">{Object.entries(LUZES).map(([k, v]) => <button key={k} type="button" className={`chip ${!livre && luz === k ? "on" : ""}`} aria-pressed={!livre && luz === k} onClick={() => { setLuz(k); setLivre(""); }}>{t(v.label)}</button>)}</div></div>
          <div className="field"><label htmlFor="lv">{t("Ou descreva uma luz")}</label><input id="lv" type="text" value={livre} onChange={(e) => setLivre(e.target.value)} placeholder={t("Ex.: luz amarela quente nos ambientes")} /></div>
        </>
      }
      result={<Run gen={gen} error={error} onCancel={cancel} />}
    >
      <div className="card"><ImageInput label="Render de partida (envie ou escolha do histórico)" value={base} onChange={setBase} /></div>
    </ToolShell>
  );
}
