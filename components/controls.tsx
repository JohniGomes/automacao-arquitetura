"use client";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

/** Controle segmentado (opções lado a lado) com descrição da opção escolhida. */
export function Seg<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { v: T; label: string; desc?: string }[];
}) {
  const t = useT();
  const cur = options.find((o) => o.v === value);
  return (
    <div className="field">
      <label>{t(label)}</label>
      <div className="seg" role="group" aria-label={t(label)}>
        {options.map((o) => <button key={o.v} type="button" className={value === o.v ? "on" : ""} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{t(o.label)}</button>)}
      </div>
      {cur?.desc && <p className="small muted" style={{ margin: "6px 2px 0" }}>{t(cur.desc)}</p>}
    </div>
  );
}

/** Número de versões (1 a 4). */
export function Versions({ value, onChange, max = 4 }: { value: number; onChange: (n: number) => void; max?: number }) {
  const t = useT();
  return (
    <div className="field">
      <label>{t("Quantas versões")}</label>
      <div className="seg" role="group" aria-label={t("Quantas versões")}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => <button key={n} type="button" className={value === n ? "on" : ""} aria-pressed={value === n} onClick={() => onChange(n)}>{n}</button>)}
      </div>
    </div>
  );
}

/** Controle deslizante com rótulos nas pontas. */
export function Slider({ label, value, onChange, min, max, step = 1, left, right, valueLabel }: {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; left: string; right: string; valueLabel?: string;
}) {
  const t = useT();
  return (
    <div className="field">
      <label htmlFor={`sl-${label}`}>{t(label)}{valueLabel ? `: ${t(valueLabel)}` : ""}</label>
      <input id={`sl-${label}`} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <div className="row small muted" style={{ margin: 0 }}><span>{t(left)}</span><span>{t(right)}</span></div>
    </div>
  );
}

/** Seção que abre e fecha (opções avançadas). */
export function Fold({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="fold">
      <button type="button" className="ghost foldbtn" aria-expanded={open} onClick={onToggle}><span>{t(title)}</span><span aria-hidden="true">{open ? "−" : "+"}</span></button>
      {open && <div className="foldbody">{children}</div>}
    </div>
  );
}

export type SavedScene = { id: string; name: string; scene: string; sceneFree: string; elements: string[] };
const KEY = "arqia.scenes";

/** Cenas de luz e clima salvas pelo usuário (guardadas só neste navegador). */
export function useSavedScenes() {
  const [list, setList] = useState<SavedScene[]>([]);
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setList([]); } }, []);
  const persist = (l: SavedScene[]) => { setList(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* sem armazenamento */ } };
  return {
    list,
    add: (s: Omit<SavedScene, "id">) => persist([{ ...s, id: Math.random().toString(36).slice(2, 9) }, ...list].slice(0, 20)),
    remove: (id: string) => persist(list.filter((x) => x.id !== id)),
  };
}
