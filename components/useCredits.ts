"use client";
import { useEffect, useState } from "react";

/** Saldo de créditos: busca ao montar e atualiza quando uma geração muda o saldo (evento "credits-changed"). */
export function useCredits(initial?: number) {
  const [c, setC] = useState<number | null>(initial ?? null);
  useEffect(() => {
    const upd = () => fetch("/api/auth/me").then((r) => r.json()).then((j) => typeof j.credits === "number" && setC(j.credits)).catch(() => {});
    upd();
    window.addEventListener("credits-changed", upd);
    return () => window.removeEventListener("credits-changed", upd);
  }, []);
  return c;
}
