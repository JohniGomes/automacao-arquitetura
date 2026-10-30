"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectTile } from "@/components/HomeView";
import { useT } from "@/components/I18nProvider";

type Proj = { id: string; name: string; count: number; cover: string | null };

export default function Projetos() {
  const router = useRouter();
  const t = useT();
  const [list, setList] = useState<Proj[] | null>(null);
  const [q, setQ] = useState("");
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => { fetch("/api/projects").then((r) => r.json()).then((j) => setList(j.projects || [])).catch(() => setList([])); }, []);

  async function criar() {
    setErro("");
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nome }) });
    const j = await r.json();
    if (!r.ok) { setErro(j.error || "Não foi possível criar."); return; }
    router.push(`/app/projetos/${j.project.id}`);
  }

  const shown = (list || []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="thead">
        <h1>{t("Projetos")}</h1>
        <button type="button" onClick={() => setNovo(true)}>{t("Novo projeto")}</button>
      </div>
      {novo && (
        <div className="card" style={{ maxWidth: 460 }}>
          <label htmlFor="np">{t("Nome do projeto")}</label>
          <div className="row gap" style={{ flexWrap: "nowrap" }}>
            <input id="np" type="text" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nome.trim() && criar()} />
            <button type="button" onClick={criar} disabled={!nome.trim()}>{t("Criar")}</button>
            <button type="button" className="ghost" onClick={() => { setNovo(false); setNome(""); }}>{t("Cancelar")}</button>
          </div>
          {erro && <p className="err small">{t(erro)}</p>}
        </div>
      )}
      <div className="field" style={{ maxWidth: 360 }}><input type="text" placeholder={t("Buscar projeto")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Buscar projeto")} /></div>
      {list === null ? <p className="muted">{t("Carregando…")}</p> : shown.length === 0 ? (
        <p className="muted">{list.length === 0 ? t("Você ainda não tem projetos. Crie o primeiro e use-o nas ferramentas.") : t("Nenhum projeto encontrado.")}</p>
      ) : (
        <div className="pgrid big">{shown.map((p) => <ProjectTile key={p.id} p={p} />)}</div>
      )}
    </>
  );
}
