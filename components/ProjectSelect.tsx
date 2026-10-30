"use client";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

export const PROJECT_KEY = "arqia.project";
type P = { id: string; name: string };

/** Escolhe o projeto que receberá as próximas gerações. A escolha fica guardada neste navegador. */
export default function ProjectSelect() {
  const t = useT();
  const [list, setList] = useState<P[]>([]);
  const [val, setVal] = useState("");
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    try { setVal(localStorage.getItem(PROJECT_KEY) || ""); } catch { /* sem armazenamento */ }
    fetch("/api/projects").then((r) => r.json()).then((j) => {
      const ps: P[] = j.projects || [];
      setList(ps);
      setVal((v) => (v && !ps.some((p) => p.id === v) ? "" : v));
    }).catch(() => {});
  }, []);

  const choose = (v: string) => {
    setVal(v);
    try { v ? localStorage.setItem(PROJECT_KEY, v) : localStorage.removeItem(PROJECT_KEY); } catch { /* ignora */ }
  };

  async function criar() {
    setErr("");
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nome }) });
    const j = await r.json();
    if (!r.ok) { setErr(t(j.error || "Não foi possível criar.")); return; }
    setList([j.project, ...list]); choose(j.project.id); setNovo(false); setNome("");
  }

  return (
    <div className="field">
      <label htmlFor="proj">{t("Projeto")}</label>
      <select id="proj" value={novo ? "__novo" : val} onChange={(e) => (e.target.value === "__novo" ? setNovo(true) : (setNovo(false), choose(e.target.value)))}>
        <option value="">{t("Sem projeto")}</option>
        {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="__novo">{t("+ Novo projeto…")}</option>
      </select>
      {novo && (
        <div className="row gap" style={{ marginTop: 8, flexWrap: "nowrap" }}>
          <input type="text" placeholder={t("Nome do projeto")} value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), criar())} aria-label={t("Nome do novo projeto")} />
          <button type="button" onClick={criar} disabled={!nome.trim()}>{t("Criar")}</button>
        </div>
      )}
      {err && <p className="err small">{err}</p>}
    </div>
  );
}
