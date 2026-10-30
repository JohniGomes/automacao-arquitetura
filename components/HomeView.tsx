"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ToolIcon from "./ToolIcon";
import { Gen } from "./client";
import { useT } from "./I18nProvider";
import { TOOLS, TYPE_LABEL, searchTools, toolById } from "@/lib/tools";
import { usePins } from "@/lib/usePins";

type Proj = { id: string; name: string; count: number; cover: string | null };

export function ProjectTile({ p }: { p: Proj }) {
  const t = useT();
  return (
    <Link href={`/app/projetos/${p.id}`} className="ptile">
      <div className="pcover">{p.cover ? <img src={`/api/files/${p.cover}`} alt="" loading="lazy" /> : <span>{t("Sem imagens")}</span>}</div>
      <strong>{p.name}</strong>
      <span className="muted small">{p.count} {p.count === 1 ? t("geração") : t("gerações")}</span>
    </Link>
  );
}

export default function HomeView({ firstName }: { firstName: string }) {
  const router = useRouter();
  const t = useT();
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
        <h1>{t(hello)}, {firstName}.</h1>
        <div className="hsearch">
          <input type="text" placeholder={t("Buscar ferramenta")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Buscar ferramenta")}
            onKeyDown={(e) => { if (e.key === "Enter" && found[0]) router.push(found[0].href); }} />
          {q.trim() && (
            <div className="hresults">
              {found.length ? found.map((x) => <Link key={x.id} href={x.href}><ToolIcon tool={x} size={30} /><span>{t(x.label)}</span></Link>) : <span className="muted small" style={{ padding: 10 }}>{t("Nenhuma ferramenta encontrada.")}</span>}
            </div>
          )}
        </div>
      </div>

      <section aria-label={t("Atalhos")}>
        <div className="shortcuts">
          {pins.map((id) => { const x = toolById(id); return x ? (
            <Link key={id} href={x.href} className="shortcut"><ToolIcon tool={x} size={52} /><span>{t(x.label)}</span></Link>
          ) : null; })}
          <button type="button" className="shortcut custom" onClick={() => setEdit(!edit)} aria-expanded={edit}>
            <span className="ticon tn-0" style={{ width: 52, height: 52 }}><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4" /></svg></span>
            <span>{t("Personalizar")}</span>
          </button>
        </div>
        {edit && (
          <div className="card pins">
            <p className="small muted" style={{ marginTop: 0 }}>{t("Escolha os atalhos da tela inicial.")}</p>
            <div className="chips">
              {TOOLS.map((x) => <button key={x.id} type="button" className={`chip ${pins.includes(x.id) ? "on" : ""}`} aria-pressed={pins.includes(x.id)} onClick={() => toggle(x.id)}>{t(x.label)}</button>)}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="row"><h2><Link href="/app/projetos" className="hl">{t("Projetos")}</Link></h2><Link href="/app/projetos" className="small">{t("Ver todos")}</Link></div>
        <div className="pgrid">
          <button type="button" className="ptile newp" onClick={() => setNovo(true)} aria-label={t("Criar novo projeto")}><div className="pcover"><span className="plus">+</span></div><strong>{t("Novo projeto")}</strong></button>
          {projects === null && <span className="muted small">{t("Carregando…")}</span>}
          {projects?.slice(0, 5).map((p) => <ProjectTile key={p.id} p={p} />)}
        </div>
        {novo && (
          <div className="card" style={{ maxWidth: 440 }}>
            <label htmlFor="np">{t("Nome do projeto")}</label>
            <div className="row gap" style={{ flexWrap: "nowrap" }}>
              <input id="np" type="text" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nome.trim() && criar()} />
              <button type="button" onClick={criar} disabled={!nome.trim()}>{t("Criar")}</button>
              <button type="button" className="ghost" onClick={() => { setNovo(false); setNome(""); }}>{t("Cancelar")}</button>
            </div>
            {erro && <p className="err small">{t(erro)}</p>}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <div className="row"><h2>{t("Continue de onde parou")}</h2><Link href="/app/geracoes" className="small">{t("Todas as gerações")}</Link></div>
          <div className="pgrid">
            {recent.map((g) => {
              const img = g.outputs.find((o) => o.kind === "image");
              return (
                <Link key={g.id} href={`/app/geracoes#g-${g.id}`} className="ptile">
                  <div className="pcover">{img ? <img src={`/api/files/${img.file}`} alt="" loading="lazy" /> : <span>{g.outputs.length ? t("Vídeo") : "—"}</span>}</div>
                  <strong>{t(g.summary)}</strong>
                  <span className="muted small">{t(TYPE_LABEL[g.type] || g.type)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
