"use client";
import { useEffect, useState } from "react";
import { Gen, Results } from "@/components/client";

export default function Historico() {
  const [list, setList] = useState<Gen[] | null>(null);
  useEffect(() => { fetch("/api/jobs").then((r) => r.json()).then((j) => setList(j.generations)); }, []);
  if (!list) return <p className="muted">Carregando…</p>;
  return (
    <>
      <h1>Histórico</h1>
      {list.length === 0 && <p className="muted">Nada gerado ainda.</p>}
      {list.map((g) => (
        <details key={g.id} className="card">
          <summary><strong>{g.summary}</strong> <span className="muted small">{new Date(g.createdAt).toLocaleString("pt-BR")} · {g.cost} créditos · {g.status === "done" ? "pronto" : g.status === "error" ? "erro" : "em andamento"}{g.mock ? " · mock" : ""}</span></summary>
          {g.error && <p className="err">{g.error}</p>}
          {g.prompt && <p className="small muted">Prompt: {g.prompt}</p>}
          <Results gen={g} />
        </details>
      ))}
    </>
  );
}
