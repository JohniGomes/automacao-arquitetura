"use client";
import { useEffect, useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { AMBIENTES } from "@/lib/prompts";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

export default function Moodboard() {
  const t = useT();
  const [templates, setTemplates] = useState<{ file: string; name: string }[]>([]);
  const [tpl, setTpl] = useState<string>("");
  const [custom, setCustom] = useState<Val>(null);
  const [amb, setAmb] = useState("cozinha");
  const [house, setHouse] = useState<Val>(null);
  const { gen, error, busy, submit } = useJob();

  useEffect(() => { fetch("/api/templates").then((r) => r.json()).then((j) => setTemplates(j.templates)); }, []);
  const template: Val = custom || (tpl ? "tpl:" + tpl : null);

  return (
    <ToolShell
      title="Moodboard por ambiente"
      cost={COSTS.moodboard}
      busy={busy}
      canGenerate={!!template && !!house}
      onGenerate={() => submit({ type: "moodboard", ambiente: amb, house, template })}
      panel={<div className="field"><label>{t("Ambiente")}</label><div className="chips">{Object.entries(AMBIENTES).map(([k, v]) => <button key={k} type="button" className={`chip ${amb === k ? "on" : ""}`} aria-pressed={amb === k} onClick={() => setAmb(k)}>{t(v.label)}</button>)}</div></div>}
      result={<Run gen={gen} error={error} />}
    >
      <div className="card">
        <div className="field"><label>{t("Modelo da galeria")}</label>
          {templates.length === 0 ? <p className="muted">{t("Nenhum modelo cadastrado. Adicione imagens em templates/moodboards/ ou envie um print abaixo.")}</p> :
            <div className="thumbs">{templates.map((m) => (
              <img key={m.file} className={tpl === m.file && !custom ? "sel" : ""} style={{ height: 140 }} src={`/api/templates?img=${encodeURIComponent(m.file)}`} alt={m.name} title={m.name} onClick={() => { setTpl(m.file); setCustom(null); }} />
            ))}</div>}
          <ImageInput label="…ou envie um print do Pinterest como modelo" value={custom} onChange={setCustom} history={false} />
        </div>
        <ImageInput label="Imagem da casa de referência (render do projeto)" value={house} onChange={setHouse} />
      </div>
    </ToolShell>
  );
}
