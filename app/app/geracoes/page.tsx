"use client";
import { useEffect, useState } from "react";
import { Gen } from "@/components/client";
import GenCard, { Proj } from "@/components/GenCard";
import { TYPE_LABEL } from "@/lib/tools";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Geracoes() {
  const [gens, setGens] = useState<Gen[] | null>(null);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [tab, setTab] = useState<"todas" | "fav">("todas");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [proj, setProj] = useState("");

  useEffect(() => {
    fetch("/api/jobs").then((r) => r.json()).then((j) => setGens(j.generations || [])).catch(() => setGens([]));
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.projects || [])).catch(() => {});
  }, []);
  useEffect(() => {
    // abre a geração indicada no link (#g-<id>)
    if (gens && location.hash.startsWith("#g-")) {
      const el = document.getElementById(location.hash.slice(1)) as HTMLDetailsElement | null;
      if (el) { el.open = true; el.scrollIntoView({ block: "start" }); }
    }
  }, [gens]);

  const shown = (gens || []).filter((g) =>
    (tab === "todas" || g.favorite) &&
    (!tipo || g.type === tipo) &&
    (!proj || (proj === "__none" ? !g.projectId : g.projectId === proj)) &&
    (!q.trim() || norm(g.summary + " " + (TYPE_LABEL[g.type] || "")).includes(norm(q.trim()))),
  );

  return (
    <>
      <div className="thead"><h1>Gerações</h1></div>
      <div className="row gap" style={{ marginBottom: 12 }}>
        <div className="chips">
          <button type="button" className={`chip ${tab === "todas" ? "on" : ""}`} aria-pressed={tab === "todas"} onClick={() => setTab("todas")}>Todas</button>
          <button type="button" className={`chip ${tab === "fav" ? "on" : ""}`} aria-pressed={tab === "fav"} onClick={() => setTab("fav")}>Favoritas</button>
        </div>
        <input type="text" placeholder="Buscar por tipo ou nome" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar gerações" style={{ maxWidth: 280 }} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo" style={{ width: "auto" }}>
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={proj} onChange={(e) => setProj(e.target.value)} aria-label="Filtrar por projeto" style={{ width: "auto" }}>
          <option value="">Todos os projetos</option>
          <option value="__none">Sem projeto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {gens === null ? <p className="muted">Carregando…</p> : shown.length === 0 ? (
        <p className="muted">{gens.length === 0 ? "Nada gerado ainda. Escolha uma ferramenta no menu." : tab === "fav" ? "Nenhuma geração favorita." : "Nenhuma geração encontrada."}</p>
      ) : shown.map((g) => <GenCard key={g.id} gen={g} projects={projects} onChange={(u) => setGens((a) => (a || []).map((x) => (x.id === u.id ? u : x)))} />)}
    </>
  );
}
