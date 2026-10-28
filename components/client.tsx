"use client";
import { useEffect, useRef, useState } from "react";

export type Gen = {
  id: string; type: string; status: "queued" | "running" | "done" | "error"; progress: number; message: string;
  summary: string; prompt?: string; outputs: { file: string; kind: "image" | "video"; label?: string }[];
  cost: number; mock: boolean; error?: string; createdAt: string; usage: { images: number; videoClips: number };
};
export type Val = File | string | null;

/** Envia um job (multipart) e acompanha o progresso por polling. */
export function useJob() {
  const [gen, setGen] = useState<Gen | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function submit(fields: Record<string, Val>) {
    setError(""); setGen(null); setBusy(true);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v != null && v !== "") fd.append(k, v);
    const r = await fetch("/api/jobs", { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Erro ao enviar."); setBusy(false); return; }
    const poll = async () => {
      const g = await fetch(`/api/jobs/${j.id}`).then((x) => x.json());
      if (!g.generation) return;
      setGen(g.generation);
      window.dispatchEvent(new Event("credits-changed"));
      if (g.generation.status === "done" || g.generation.status === "error") {
        if (timer.current) clearInterval(timer.current);
        setBusy(false);
      }
    };
    await poll();
    timer.current = setInterval(poll, 1500);
  }
  return { gen, error, busy, submit };
}

export function Progress({ gen }: { gen: Gen }) {
  return (
    <div className="card">
      <div className="row"><strong>{gen.summary}</strong><span className={`tag ${gen.status}`}>{{ queued: "Na fila", running: "Gerando", done: "Pronto", error: "Erro" }[gen.status]}</span></div>
      {(gen.status === "queued" || gen.status === "running") && (
        <><div className="bar"><div style={{ width: `${gen.progress}%` }} /></div><p className="muted">{gen.progress}% — {gen.message}</p></>
      )}
      {gen.status === "error" && <p className="err">{gen.error} {gen.message}</p>}
    </div>
  );
}

export function Results({ gen }: { gen: Gen }) {
  if (!gen.outputs.length) return null;
  return (
    <div className="results">
      {gen.mock && <p className="warn">Modo mock: estas são imagens/vídeos de exemplo, não saídas reais de IA.</p>}
      {gen.type === "mapa" && <p className="attr">Imagens de satélite © Google · Dados do mapa © Google e provedores. Uso sujeito aos Termos da Google Maps Platform.</p>}
      <div className="grid">
        {gen.outputs.map((o) => (
          <figure key={o.file}>
            {o.kind === "video" ? <video src={`/api/files/${o.file}`} controls /> : <img src={`/api/files/${o.file}`} alt={o.label || ""} />}
            <figcaption><span>{o.label}</span><a href={`/api/files/${o.file}?dl=1`}>Baixar</a></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function Run({ gen, error }: { gen: Gen | null; error: string }) {
  return (<>
    {error && <p className="err">{error}</p>}
    {gen && <><Progress gen={gen} /><Results gen={gen} /></>}
  </>);
}

/** Seletor de imagem: upload, ou reaproveitar uma imagem do histórico (e, opcionalmente, modelos da galeria). */
export function ImageInput({ label, value, onChange, history = true, hint }: {
  label: string; value: Val; onChange: (v: Val) => void; history?: boolean; hint?: string;
}) {
  const [files, setFiles] = useState<{ file: string; label?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (value instanceof File) { const u = URL.createObjectURL(value); setPreview(u); return () => URL.revokeObjectURL(u); }
    if (typeof value === "string" && value.startsWith("ref:")) setPreview(`/api/files/${value.slice(4)}`);
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
    <div className="field">
      <label>{label}</label>
      {hint && <p className="muted small">{hint}</p>}
      <div className="row gap">
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        {history && <button type="button" className="ghost" onClick={loadHistory}>Usar do histórico</button>}
        {value && <button type="button" className="ghost" onClick={() => onChange(null)}>Limpar</button>}
      </div>
      {open && (
        <div className="thumbs">
          {files.length === 0 && <p className="muted">Nenhuma imagem no histórico ainda.</p>}
          {files.map((f) => <img key={f.file} src={`/api/files/${f.file}`} alt={f.label} title={f.label} onClick={() => { onChange("ref:" + f.file); setOpen(false); }} />)}
        </div>
      )}
      {preview && <img className="preview" src={preview} alt="prévia" />}
    </div>
  );
}

export function Disclaimer() {
  return <p className="muted small">A IA gera imagens ilustrativas e não substitui a responsabilidade técnica do arquiteto: confira geometria, medidas e conformidade antes de apresentar ao cliente.</p>;
}
