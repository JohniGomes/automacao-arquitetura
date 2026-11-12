"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "ok" | "error" | "info";
type Item = { id: number; text: string; kind: Kind };
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

/** Aviso leve e temporário. Uso: const toast = useToast(); toast(mensagem). */
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, kind: Kind = "ok") => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((x) => <div key={x.id} className={`toast ${x.kind === "ok" ? "" : x.kind}`}><span className="dot" aria-hidden="true" />{x.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}
