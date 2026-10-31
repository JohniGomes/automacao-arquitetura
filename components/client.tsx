"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "./I18nProvider";

export type Gen = {
  id: string; type: string; status: "queued" | "running" | "done" | "error"; progress: number; message: string;
  summary: string; outputs: { file: string; kind: "image" | "video"; label?: string }[];
  cost: number; mock: boolean; error?: string; createdAt: string; usage: { images: number; videoClips: number };
  projectId?: string | null; favorite?: boolean;
};
export type Val = File | string | null;

const POLL_STEPS = [1500, 2000, 3000, 5000, 8000];

/** Envia um job (multipart) e acompanha o progresso: intervalo cresce com o tempo e pausa com a aba escondida. */
export function useJob() {
  const [gen, setGen] = useState<Gen | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const title = useRef("");

  useEffect(() => {
    stop.current = false;
    title.current = document.title;
    return () => { stop.current = true; if (timer.current) clearTimeout(timer.current); document.title = title.current; };
  }, []);

  async function submit(fields: Record<string, Val>) {
    setError(""); setGen(null); setBusy(true);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v != null && v !== "") fd.append(k, v);
    try { const pid = localStorage.getItem("arqia.project"); if (pid) fd.append("projectId", pid); } catch { /* sem projeto */ }
    let id: string;
    try {
      const r = await fetch("/api/jobs", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || "Erro ao enviar."); setBusy(false); return; }
      id = j.id;
    } catch {
      setError("Sem conexão. Verifique a internet e tente de novo.");
      setBusy(false);
      return;
    }
    let step = 0, fails = 0;
    const poll = async () => {
      if (stop.current) return;
      // aba escondida: espera voltar em vez de consultar o servidor à toa
      if (document.hidden) { document.addEventListener("visibilitychange", poll, { once: true }); return; }
      try {
        const g = await fetch(`/api/jobs/${id}`).then((x) => x.json());
        fails = 0;
        if (g.generation) {
          setGen(g.generation);
          window.dispatchEvent(new Event("credits-changed"));
          if (g.generation.status === "done" || g.generation.status === "error") {
            setBusy(false);
            if (document.hidden || !document.hasFocus()) document.title = (g.generation.status === "done" ? "✓ " : "! ") + title.current;
            return;
          }
        }
      } catch {
        if (++fails >= 4) {
          setError("Conexão perdida. Sua geração continua e aparece em Gerações quando terminar.");
          setBusy(false);
          return;
        }
      }
      timer.current = setTimeout(poll, POLL_STEPS[Math.min(step++, POLL_STEPS.length - 1)]);
    };
    await poll();
  }

  async function cancel() {
    if (!gen) return;
    const r = await fetch(`/api/jobs/${gen.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error || "Não foi possível cancelar.");
  }
  return { gen, error, busy, submit, cancel };
}

// tempo típico de cada ferramenta (aviso ao usuário; o filme leva vários minutos)
const ETA: Record<string, string> = { filme: "de 3 a 8 minutos", mapa: "cerca de 1 minuto", editor: "cerca de 1 minuto por região" };

export function Progress({ gen, onCancel }: { gen: Gen; onCancel?: () => void }) {
  const t = useT();
  const [secs, setSecs] = useState(0);
  const start = useRef(Date.now());
  const active = gen.status === "queued" || gen.status === "running";
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setSecs(Math.round((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(i);
  }, [active]);
  const canCancel = !!onCancel && (gen.status === "queued" || (gen.status === "running" && gen.type === "filme"));
  return (
    <div className="card">
      <div className="row"><strong>{t(gen.summary)}</strong><span className={`tag ${gen.status}`}>{gen.status === "done" ? "✓ " : gen.status === "error" ? "! " : ""}{t({ queued: "Na fila", running: "Gerando", done: "Pronto", error: "Erro" }[gen.status])}</span></div>
      {active && (
        <>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={gen.progress} aria-label={t(gen.summary)}><div style={{ width: `${gen.progress}%` }} /></div>
          <p className="muted" aria-live="polite">{gen.progress}% — {t(gen.message)}</p>
          <p className="small muted">{t("Tempo decorrido")}: {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}{ETA[gen.type] ? ` · ${t("costuma levar")} ${t(ETA[gen.type])}` : ""}. {t("Você pode sair desta tela: a geração continua e aparece em Gerações.")}</p>
          {canCancel && <button type="button" className="ghost" onClick={onCancel}>{t("Cancelar geração")}</button>}
        </>
      )}
      {gen.status === "error" && <p className="alert err" role="alert">{t(gen.error || "")} {t(gen.message)}</p>}
    </div>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useT();
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt || t("Imagem ampliada")} onClick={onClose}>
      <button ref={btn} type="button" className="ghost lbclose" onClick={onClose}>{t("Fechar")}</button>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export function Results({ gen }: { gen: Gen }) {
  const t = useT();
  const [big, setBig] = useState<{ src: string; alt: string } | null>(null);
  if (!gen.outputs.length) return null;
  return (
    <div className="results">
      {gen.mock && <p className="warn">{t("Modo mock: estas são imagens/vídeos de exemplo, não saídas reais de IA.")}</p>}
      {gen.type === "mapa" && <p className="attr">{t("Imagens de satélite © Google · Dados do mapa © Google e provedores. Uso sujeito aos Termos da Google Maps Platform.")}</p>}
      <div className="grid">
        {gen.outputs.map((o) => (
          <figure key={o.file}>
            {o.kind === "video"
              ? <video src={`/api/files/${o.file}`} controls preload="metadata" />
              : <button type="button" className="zoom" aria-label={t("Ampliar imagem")} onClick={() => setBig({ src: `/api/files/${o.file}`, alt: t(o.label || "") })}><img src={`/api/files/${o.file}?w=900`} alt={t(o.label || "")} loading="lazy" decoding="async" /></button>}
            <figcaption><span>{t(o.label || "")}</span><a href={`/api/files/${o.file}?dl=1`}>{t("Baixar")}</a></figcaption>
          </figure>
        ))}
      </div>
      {big && <Lightbox src={big.src} alt={big.alt} onClose={() => setBig(null)} />}
    </div>
  );
}

export function Run({ gen, error, onCancel }: { gen: Gen | null; error: string; onCancel?: () => void }) {
  const t = useT();
  return (<>
    {error && <p className="alert err" role="alert">{t(error)}</p>}
    {gen && <><Progress gen={gen} onCancel={onCancel} /><Results gen={gen} /></>}
  </>);
}

/** Seletor de imagem: upload, ou reaproveitar uma imagem do histórico (e, opcionalmente, modelos da galeria). */
export function ImageInput({ label, value, onChange, history = true, hint, showPreview = true }: {
  label: string; value: Val; onChange: (v: Val) => void; history?: boolean; hint?: string; showPreview?: boolean;
}) {
  const t = useT();
  const id = useId();
  const [files, setFiles] = useState<{ file: string; label?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value instanceof File) { const u = URL.createObjectURL(value); setPreview(u); return () => URL.revokeObjectURL(u); }
    if (typeof value === "string" && value.startsWith("ref:")) setPreview(`/api/files/${value.slice(4)}?w=900`);
    else if (typeof value === "string" && value.startsWith("tpl:")) setPreview(`/api/templates?img=${encodeURIComponent(value.slice(4))}`);
    else setPreview("");
  }, [value]);

  async function loadHistory() {
    setOpen(!open);
    if (!open) {
      const j = await fetch("/api/jobs").then((r) => r.json());
      setFiles((j.generations as Gen[]).filter((g) => g.status === "done").flatMap((g) => g.outputs.filter((o) => o.kind === "image" && !o.label?.includes("entrada")).map((o) => ({ file: o.file, label: o.label }))));
    }
  }
  return (
    <div className="field" role="group" aria-labelledby={`${id}-l`}>
      <label id={`${id}-l`}>{t(label)}</label>
      {hint && <p className="muted small">{t(hint)}</p>}
      <div className="row gap">
        {/* botão próprio: o texto do seletor nativo segue o idioma do navegador, não o do app */}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} aria-labelledby={`${id}-l`} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>{t("Escolher arquivo")}</button>
        <span className="small muted filename" style={{ margin: 0 }}>{value instanceof File ? value.name : t("Nenhum arquivo escolhido")}</span>
        {history && <button type="button" className="ghost" onClick={loadHistory} aria-expanded={open}>{t("Usar do histórico")}</button>}
        {value && <button type="button" className="ghost" onClick={() => onChange(null)}>{t("Limpar")}</button>}
      </div>
      {open && (
        <div className="thumbs">
          {files.length === 0 && <div className="empty">{t("Nenhuma imagem no histórico ainda.")}</div>}
          {files.map((f) => (
            <button key={f.file} type="button" className="thumb" title={f.label} aria-label={t(f.label || "Imagem")} onClick={() => { onChange("ref:" + f.file); setOpen(false); }}>
              <img src={`/api/files/${f.file}?w=320`} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
      {showPreview && preview && <img className="preview" src={preview} alt={t("prévia")} decoding="async" />}
    </div>
  );
}
