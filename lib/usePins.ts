"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PINS, TOOLS, ToolId } from "./tools";

const KEY = "arqia.pins";
const valid = (a: unknown): ToolId[] => (Array.isArray(a) ? a.filter((x): x is ToolId => TOOLS.some((t) => t.id === x)) : DEFAULT_PINS);

function read(): ToolId[] {
  try { const raw = localStorage.getItem(KEY); return raw ? valid(JSON.parse(raw)) : DEFAULT_PINS; } catch { return DEFAULT_PINS; }
}

/** Atalhos fixados pelo usuário (menu lateral e home). Guardado só neste navegador. */
export function usePins() {
  const [pins, setPins] = useState<ToolId[]>(DEFAULT_PINS);
  useEffect(() => {
    setPins(read());
    const sync = () => setPins(read());
    window.addEventListener("pins-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("pins-changed", sync); window.removeEventListener("storage", sync); };
  }, []);
  const toggle = useCallback((id: ToolId) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sem armazenamento: só muda nesta sessão */ }
    setPins(next);
    window.dispatchEvent(new Event("pins-changed"));
  }, []);
  return { pins, toggle };
}
