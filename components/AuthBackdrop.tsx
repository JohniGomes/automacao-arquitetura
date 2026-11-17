"use client";
import { useEffect, useRef, useState } from "react";
import { FUNDOS, FUNDO_COOKIE } from "@/lib/acesso";

const PREV = "acesso-prev";

/**
 * Foto de fundo das telas de acesso. A cada clique em um elemento marcado com data-bg (trocar entre entrar e criar conta,
 * abrir o e-mail, esqueci a senha) a foto seguinte entra com um fade. O índice vai para um cookie: a página seguinte já
 * nasce com a foto nova no servidor, e a anterior aparece por baixo só para o fade.
 */
export default function AuthBackdrop({ initial }: { initial: number }) {
  const [cur, setCur] = useState(initial);
  const [prev, setPrev] = useState<number | null>(null);
  const curRef = useRef(initial);

  useEffect(() => {
    // veio de outra tela de acesso: a foto antiga fica por baixo e a nova entra com fade
    try {
      const p = sessionStorage.getItem(PREV);
      sessionStorage.removeItem(PREV);
      if (p !== null && Number(p) !== initial && Number(p) >= 0 && Number(p) < FUNDOS.length) { setPrev(Number(p)); setCur(initial); }
    } catch { /* sem sessionStorage */ }
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("[data-bg]");
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const from = curRef.current;
      const next = (from + 1) % FUNDOS.length;
      const img = new Image();
      img.src = FUNDOS[next];
      curRef.current = next;
      document.cookie = `${FUNDO_COOKIE}=${next}; path=/; max-age=86400; samesite=lax`;
      try { sessionStorage.setItem(PREV, String(from)); } catch { /* sem sessionStorage */ }
      setPrev(from);
      setCur(next);
    };
    document.addEventListener("click", onClick);
    // deixa a próxima foto pronta para o primeiro clique
    const warm = new Image();
    warm.src = FUNDOS[(initial + 1) % FUNDOS.length];
    return () => document.removeEventListener("click", onClick);
  }, [initial]);

  return (
    <div className="bg" aria-hidden="true">
      {prev !== null && <div className="bgl" style={{ backgroundImage: `url(${FUNDOS[prev]})` }} />}
      <div key={cur} className={`bgl ${prev !== null ? "fadein" : ""}`} style={{ backgroundImage: `url(${FUNDOS[cur]})` }} />
    </div>
  );
}
