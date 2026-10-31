"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ToolIcon from "./ToolIcon";
import { Gen } from "./client";
import { useT } from "./I18nProvider";
import { useCredits } from "./useCredits";
import { TOOLS, TYPE_LABEL, searchTools, toolById } from "@/lib/tools";
import { COSTS } from "@/lib/costs";
import { usePins } from "@/lib/usePins";

type Proj = { id: string; name: string; count: number; cover: string | null };

export function ProjectTile({ p }: { p: Proj }) {
  const t = useT();
  return (
    <Link href={`/app/projetos/${p.id}`} className="ptile">
      <div className="pcover">{p.cover ? <img src={`/api/files/${p.cover}?w=480`} alt="" loading="lazy" decoding="async" /> : <span>{t("Sem imagens")}</span>}</div>
      <strong>{p.name}</strong>
      <span className="muted small">{p.count} {p.count === 1 ? t("geração") : t("gerações")}</span>
    </Link>
  );
}

const TIPS = [
  "Dica: use um print nítido, com câmera ampla e materiais já aplicados no modelo.",
  "Dica: parta de um render ou foto com a câmera que você quer manter.",
  "Dica: use a imagem na maior resolução que você tiver, sem borrões.",
];

export default function HomeView({ firstName }: { firstName: string }) {
  const router = useRouter();
  const t = useT();
  const credits = useCredits();
  const { pins, toggle } = usePins();
  const [hello, setHello] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(false);
  const [projects, setProjects] = useState<Proj[] | null>(null);
  const [gens, setGens] = useState<Gen[] | null>(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setHello(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.projects || [])).catch(() => setProjects([]));
    fetch("/api/jobs").then((r) => r.json()).then((j) => setGens((j.generations || []).filter((g: Gen) => g.status === "done"))).catch(() => setGens([]));
  }, []);

  const found = q.trim() ? searchTools(q) : [];
  const recent = (gens || []).slice(0, 6);
  const did = (type: string) => (gens || []).some((g) => g.type === type);
  const steps = [
    { label: "Crie um projeto", done: (projects?.length || 0) > 0, href: "" },
    { label: "Gere o seu primeiro render", done: did("render"), href: "/app/render" },
    { label: "Teste uma variação de luz", done: did("luz"), href: "/app/luz" },
    { label: "Monte um moodboard", done: did("moodboard"), href: "/app/moodboard" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const tip = TIPS[new Date().getDate() % TIPS.length];

  async function criar() {
    setErro("");
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nome }) });
    const j = await r.json();
    if (!r.ok) { setErro(j.error || "Não foi possível criar."); return; }
    router.push(`/app/projetos/${j.project.id}`);
  }

  const featured = [
    { id: "render", text: "Do print do 3D ao render fotorrealista.", cost: t("a partir de {n} créditos", { n: COSTS.renderPorImagem }) },
    { id: "moodboard", text: "Paleta e materiais a partir do render da casa.", cost: t("a partir de {n} créditos", { n: COSTS.moodboard }) },
    { id: "filme", text: "Vídeo do projeto a partir das suas imagens.", cost: t("{n} créditos por cena", { n: COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena }) },
  ];

  return (
    <>
      <div className="homehead">
        {/* a saudação depende da hora do navegador: fica invisível até montar, sem piscar o texto errado */}
        <h1 style={{ visibility: hello ? "visible" : "hidden" }}>{hello ? t(hello) : "…"}, {firstName}.</h1>
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

      <section aria-label={t("Comece por aqui")}>
        <h2 className="sechead">{t("Comece por aqui")}</h2>
        <div className="featured">
          {featured.map((f) => { const x = toolById(f.id)!; return (
            <Link key={f.id} href={x.href} className="fcard">
              <ToolIcon tool={x} size={46} />
              <div><strong>{t(x.label)}</strong><p>{t(f.text)}</p><span className="fcost">{f.cost}</span></div>
            </Link>
          ); })}
        </div>
      </section>

      <div className="homegrid">
        <div className="homemain">
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
              {projects === null && <div className="ptile skeleton" aria-hidden="true"><div className="pcover" /><strong>&nbsp;</strong></div>}
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
                {erro && <p className="alert err small" role="alert">{t(erro)}</p>}
              </div>
            )}
          </section>

          <section>
            <div className="row"><h2>{t("Continue de onde parou")}</h2><Link href="/app/geracoes" className="small">{t("Todas as gerações")}</Link></div>
            {gens === null ? (
              <div className="pgrid"><div className="ptile skeleton" aria-hidden="true"><div className="pcover" /><strong>&nbsp;</strong></div></div>
            ) : recent.length === 0 ? (
              <div className="empty">{t("Nada gerado ainda. Escolha uma ferramenta no menu.")}</div>
            ) : (
              <div className="pgrid">
                {recent.map((g) => {
                  const img = g.outputs.find((o) => o.kind === "image");
                  return (
                    <Link key={g.id} href={`/app/geracoes#g-${g.id}`} className="ptile">
                      <div className="pcover">{img ? <img src={`/api/files/${img.file}?w=480`} alt="" loading="lazy" decoding="async" /> : <span>{g.outputs.length ? t("Vídeo") : "—"}</span>}</div>
                      <strong>{t(g.summary)}</strong>
                      <span className="muted small">{t(TYPE_LABEL[g.type] || g.type)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="homeside" aria-label={t("Resumo")}>
          <div className="card sidecard">
            <p className="small muted" style={{ margin: 0 }}>{t("Seu saldo")}</p>
            <p className="bigcredits"><b>{credits ?? "…"}</b> {t("créditos")}</p>
            <Link href="/app/creditos" className="btn ghost">{t("Ver planos")}</Link>
          </div>
          {projects !== null && gens !== null && doneCount < steps.length && (
            <div className="card sidecard">
              <h3>{t("Primeiros passos")} <span className="small muted">{doneCount}/{steps.length}</span></h3>
              <ol className="onb">
                {steps.map((s) => (
                  <li key={s.label} className={s.done ? "done" : ""}>
                    <span className="chk" aria-hidden="true">{s.done ? "✓" : ""}</span>
                    {s.done ? <span>{t(s.label)}</span> : s.href ? <Link href={s.href}>{t(s.label)}</Link> : <button type="button" className="linkbtn" onClick={() => setNovo(true)}>{t(s.label)}</button>}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="card sidecard tipcard"><p className="small" style={{ margin: 0 }}>{t(tip)}</p></div>
        </aside>
      </div>
    </>
  );
}
