"use client";
import { useId } from "react";

export type Humor = "feliz" | "acenando" | "pensando" | "surpreso";

const TINTA = "#2B2A28", CREME = "#F6F1EA", LARANJA = "#FF7A59";
/** Estilo inline em cada forma: as regras globais de ícone do app (svg { fill: none }) não podem apagar o mascote. */
const tr = (stroke: string, w: number) => ({ fill: "none", stroke, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/**
 * Cro, o mascote do Croqui: a casinha da marca com olhos, bochechas e um sorriso. Respira (sobe e desce devagar) e pisca.
 * `humor` muda a boca e os olhos; "acenando" levanta uma mãozinha. As animações param com "reduzir movimento" (mascote.css).
 */
export default function Mascote({ humor = "feliz", size = 96, className = "", animado = true }: { humor?: Humor; size?: number; className?: string; animado?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const boca =
    humor === "pensando" ? <path d="M53 94h14" style={tr(TINTA, 3)} />
    : humor === "surpreso" ? <ellipse cx="60" cy="94" rx="5" ry="6" style={{ fill: TINTA, stroke: "none" }} />
    : <path d="M50 90c3 9 17 9 20 0" style={tr(TINTA, 3)} />;
  const olhoY = humor === "pensando" ? 77 : 80;
  const sol = { fill: "#fff", stroke: "none" };
  return (
    <svg className={`cro ${animado ? "cro-vivo" : ""} ${className}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Cro, o mascote do Croqui">
      <defs>
        <linearGradient id={`cro-tel-${gid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF9B7A" /><stop offset="1" stopColor="#E4572E" /></linearGradient>
      </defs>
      <g className="cro-corpo">
        <path d="M8 108h104" style={tr(LARANJA, 4)} />
        <rect x="24" y="58" width="72" height="48" rx="9" style={{ fill: CREME, stroke: TINTA, strokeWidth: 3 }} />
        <path d="M9 64 60 18l51 46z" style={{ fill: `url(#cro-tel-${gid})`, stroke: TINTA, strokeWidth: 3, strokeLinejoin: "round" }} />
        <circle cx="93" cy="24" r="5" style={{ fill: LARANJA, stroke: "none" }} />
        <g className="cro-olhos">
          <ellipse cx="44" cy={olhoY} rx="5.5" ry="8" style={{ fill: TINTA, stroke: "none" }} />
          <ellipse cx="76" cy={olhoY} rx="5.5" ry="8" style={{ fill: TINTA, stroke: "none" }} />
          <circle cx="46" cy={olhoY - 3} r="2" style={sol} />
          <circle cx="78" cy={olhoY - 3} r="2" style={sol} />
        </g>
        <circle cx="35" cy="91" r="5" style={{ fill: "#FF9DB8", stroke: "none", opacity: 0.55 }} />
        <circle cx="85" cy="91" r="5" style={{ fill: "#FF9DB8", stroke: "none", opacity: 0.55 }} />
        {boca}
        {humor === "acenando" && (
          <g className="cro-mao">
            <path d="M96 84c8-2 12-8 12-16" style={tr(TINTA, 3)} />
            <circle cx="109" cy="64" r="6.5" style={{ fill: CREME, stroke: TINTA, strokeWidth: 3 }} />
          </g>
        )}
        {humor === "pensando" && <text x="92" y="52" fontSize="22" fontWeight="700" style={{ fill: LARANJA, stroke: "none" }} fontFamily="inherit">?</text>}
      </g>
    </svg>
  );
}
