"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gen } from "@/components/client";
import GenCard, { Proj } from "@/components/GenCard";
import { useT } from "@/components/I18nProvider";

export default function Projeto() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const [projects, setProjects] = useState<Proj[] | null>(null);
  const [gens, setGens] = useState<Gen[]>([]);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");
  const [apagar, setApagar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.projects || [])).catch(() => setProjects([]));
    fetch("/api/jobs").then((r) => r.json()).then((j) => setGens(j.generations || [])).catch(() => {});
  }, []);

  const proj = projects?.find((p) => p.id === id);
  const mine = gens.filter((g) => g.projectId === id);

  async function renomear() {
    setErro("");
    const r = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nome }) });
    const j = await r.json();
    if (!r.ok) { setErro(t(j.error || "Não foi possível renomear.")); return; }
    setProjects((ps) => (ps || []).map((p) => (p.id === id ? { ...p, name: j.project.name } : p)));
    setEditando(false);
  }
  async function excluir() {
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (r.ok) { try { if (localStorage.getItem("arqia.project") === id) localStorage.removeItem("arqia.project"); } catch { /* ok */ } router.push("/app/projetos"); }
    else setErro(t("Não foi possível apagar o projeto."));
  }

  if (projects === null) return <p className="muted">{t("Carregando…")}</p>;
  if (!proj) return <><h1>{t("Projeto não encontrado")}</h1><p><Link href="/app/projetos">{t("Voltar aos projetos")}</Link></p></>;

  return (
    <>
      <p className="small" style={{ margin: "0 0 6px" }}><Link href="/app/projetos">{t("Projetos")}</Link> /</p>
      <div className="thead">
        {editando ? (
          <div className="row gap" style={{ flexWrap: "nowrap", flex: 1 }}>
            <input type="text" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nome.trim() && renomear()} aria-label={t("Nome do projeto")} />
            <button type="button" onClick={renomear} disabled={!nome.trim()}>{t("Salvar")}</button>
            <button type="button" className="ghost" onClick={() => setEditando(false)}>{t("Cancelar")}</button>
          </div>
        ) : (
          <>
            <h1>{proj.name}</h1>
            <div className="row gap">
              <button type="button" className="ghost" onClick={() => { setNome(proj.name); setEditando(true); }}>{t("Renomear")}</button>
              {apagar ? (
                <>
                  <span className="small">{t("Apagar o projeto? As gerações ficam na conta, sem projeto.")}</span>
                  <button type="button" onClick={excluir}>{t("Apagar")}</button>
                  <button type="button" className="ghost" onClick={() => setApagar(false)}>{t("Cancelar")}</button>
                </>
              ) : <button type="button" className="ghost" onClick={() => setApagar(true)}>{t("Apagar")}</button>}
            </div>
          </>
        )}
      </div>
      {erro && <p className="err">{erro}</p>}
      {mine.length === 0 ? (
        <p className="muted">{t("Este projeto ainda não tem gerações. Escolha-o no painel de qualquer ferramenta, no campo Projeto.")}</p>
      ) : mine.map((g) => <GenCard key={g.id} gen={g} projects={projects} onChange={(u) => setGens((a) => a.map((x) => (x.id === u.id ? u : x)))} />)}
    </>
  );
}
