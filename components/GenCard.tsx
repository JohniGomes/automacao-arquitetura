"use client";
import { useState } from "react";
import { useLang, useT } from "./I18nProvider";
import { Gen, Results } from "./client";
import { TYPE_LABEL } from "@/lib/tools";

export type Proj = { id: string; name: string };

const Heart = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />
  </svg>
);

/** Cartão de uma geração: miniaturas, favorito, projeto e resultado completo ao abrir. */
export default function GenCard({ gen, projects, onChange }: { gen: Gen; projects: Proj[]; onChange: (g: Gen) => void }) {
  const t = useT();
  const lang = useLang();
  const [err, setErr] = useState("");
  const thumbs = gen.outputs.filter((o) => o.kind === "image").slice(0, 4);

  async function patch(body: { favorite?: boolean; projectId?: string | null }) {
    setErr("");
    const r = await fetch(`/api/generations/${gen.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setErr(t(j.error || "Não foi possível salvar.")); return; }
    onChange({ ...gen, ...body });
  }

  return (
    <details className="card gcard" id={`g-${gen.id}`}>
      <summary>
        <div className="gthumbs">
          {thumbs.length ? thumbs.map((o) => <img key={o.file} src={`/api/files/${o.file}`} alt="" loading="lazy" />) : <span className="gempty">{gen.status === "error" ? t("Erro") : "…"}</span>}
        </div>
        <div className="ginfo">
          <strong>{t(gen.summary)}</strong>
          <span className="muted small">
            {t(TYPE_LABEL[gen.type] || gen.type)} · {new Date(gen.createdAt).toLocaleString(lang === "en" ? "en-US" : "pt-BR", { dateStyle: "short", timeStyle: "short" })} · {gen.cost} {t("créditos")}
            {gen.status !== "done" && ` · ${gen.status === "error" ? t("erro") : t("em andamento")}`}{gen.mock ? " · mock" : ""}
          </span>
        </div>
        <button type="button" className={`ghost fav ${gen.favorite ? "on" : ""}`} aria-pressed={!!gen.favorite} aria-label={gen.favorite ? t("Remover dos favoritos") : t("Favoritar")}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); patch({ favorite: !gen.favorite }); }}><Heart on={!!gen.favorite} /></button>
      </summary>
      <div className="gbody">
        <div className="row gap">
          <label htmlFor={`pj-${gen.id}`} style={{ margin: 0 }}>{t("Projeto")}</label>
          <select id={`pj-${gen.id}`} style={{ width: "auto", minWidth: 180 }} value={gen.projectId || ""} onChange={(e) => patch({ projectId: e.target.value || null })}>
            <option value="">{t("Sem projeto")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {err && <p className="err small">{err}</p>}
        {gen.error && <p className="err">{t(gen.error)}</p>}
        <Results gen={gen} />
      </div>
    </details>
  );
}
