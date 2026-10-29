"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ToolIcon from "./ToolIcon";
import { Gen } from "./client";
import { TOOLS, TYPE_LABEL, searchTools, toolById } from "@/lib/tools";
import { usePins } from "@/lib/usePins";

type Proj = { id: string; name: string; count: number; cover: string | null };

export function ProjectTile({ p }: { p: Proj }) {
  return (
    <Link href={`/app/projetos/${p.id}`} className="ptile">
      <div className="pcover">{p.cover ? <img src={`/api/files/${p.cover}`} alt="" loading="lazy" /> : <span>Sem imagens</span>}</div>
      <strong>{p.name}</strong>
      <span className="muted small">{p.count} {p.count === 1 ? "geração" : "gerações"}</span>
    </Link>
  );
}

export default function HomeView({ firstName }: { firstName: string }) {
  const router = useRouter();
  const { pins, toggle } = usePins();
  const [hello, setHello] = useState("Olá");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(false);
  const [projects, setProjects] = useState<Proj[] | null>(null);
  const [recent, setRecent] = useState<Gen[]>([]);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setHello(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.projects || [])).catch(() => setProjects([]));
    fetch("/api/jobs").then((r) => r.json()).then((j) => setRecent((j.generations || []).filter((g: Gen) => g.status === "done").slice(0, 4))).catch(() => {});
  }, []);

  const found = q.trim() ? searchTools(q) : [];

  async function criar() {
    setErro("");
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nome }) });
    const j = await r.json();
    if (!r.ok) { setErro(j.error || "Não foi possível criar."); return; }
    router.push(`/app/projetos/${j.project.id}`);
  }

  return (
    <>
      <div className="homehead">
        <h1>{hello}, {firstName}.</h1>
        <div className="hsearch">
          <input type="text" placeholder="Buscar ferramenta" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ferramenta"
            onKeyDown={(e) => { if (e.key === "Enter" && found[0]) router.push(found[0].href); }} />
          {q.trim() && (
            <div className="hresults">
              {found.length ? found.map((t) => <Link key={t.id} href={t.href}><ToolIcon tool={t} size={30} /><span>{t.label}</span></Link>) : <span className="muted small" style={{ padding: 10 }}>Nenhuma ferramenta encontrada.</span>}
            </div>
          )}
        </div>
      </div>

      <section aria-label="Atalhos">
        <div className="shortcuts">
          {pins.map((id) => { const t = toolById(id); return t ? (
            <Link key={id} href={t.href} className="shortcut"><ToolIcon tool={t} size={52} /><span>{t.label}</span></Link>
          ) : null; })}
          <button type="button" className="shortcut custom" onClick={() => setEdit(!edit)} aria-expanded={edit}>
            <span className="ticon tn-0" style={{ width: 52, height: 52 }}><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4" /></svg></span>
            <span>Personalizar</span>
          </button>
        </div>
        {edit && (
          <div className="card pins">
            <p className="small muted" style={{ marginTop: 0 }}>Escolha os atalhos do início e do menu lateral.</p>
            <div className="chips">
              {TOOLS.map((t) => <button key={t.id} type="button" className={`chip ${pins.includes(t.id) ? "on" : ""}`} aria-pressed={pins.includes(t.id)} onClick={() => toggle(t.id)}>{t.label}</button>)}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="row"><h2><Link href="/app/projetos" className="hl">Projetos</Link></h2><Link href="/app/projetos" className="small">Ver todos</Link></div>
        <div className="pgrid">
          <button type="button" className="ptile newp" onClick={() => setNovo(true)} aria-label="Criar novo projeto"><div className="pcover"><span className="plus">+</span></div><strong>Novo projeto</strong></button>
          {projects === null && <span className="muted small">Carregando…</span>}
          {projects?.slice(0, 5).map((p) => <ProjectTile key={p.id} p={p} />)}
        </div>
        {novo && (
          <div className="card" style={{ maxWidth: 440 }}>
            <label htmlFor="np">Nome do projeto</label>
            <div className="row gap" style={{ flexWrap: "nowrap" }}>
              <input id="np" type="text" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nome.trim() && criar()} />
              <button type="button" onClick={criar} disabled={!nome.trim()}>Criar</button>
              <button type="button" className="ghost" onClick={() => { setNovo(false); setNome(""); }}>Cancelar</button>
            </div>
            {erro && <p className="err small">{erro}</p>}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <div className="row"><h2>Continue de onde parou</h2><Link href="/app/geracoes" className="small">Todas as gerações</Link></div>
          <div className="pgrid">
            {recent.map((g) => {
              const img = g.outputs.find((o) => o.kind === "image");
              return (
                <Link key={g.id} href={`/app/geracoes#g-${g.id}`} className="ptile">
                  <div className="pcover">{img ? <img src={`/api/files/${img.file}`} alt="" loading="lazy" /> : <span>{g.outputs.length ? "Vídeo" : "—"}</span>}</div>
                  <strong>{g.summary}</strong>
                  <span className="muted small">{TYPE_LABEL[g.type] || g.type}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
