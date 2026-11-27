"use client";
import { useId } from "react";

export type Humor = "feliz" | "acenando" | "pensando" | "surpreso" | "preocupado" | "triste";

const TINTA = "#2B2A28", CREME = "#F6F1EA", LARANJA = "#FF7A59", AGUA = "#7CC4FF";
/** Estilo inline em cada forma: as regras globais de ícone do app (svg { fill: none }) não podem apagar o mascote. */
const tr = (stroke: string, w: number) => ({ fill: "none", stroke, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/**
 * Cro, o mascote do Croqui: a casinha da marca com olhos, bochechas e um sorriso. Respira (sobe e desce devagar) e pisca.
 * `humor` muda a boca e os olhos; "acenando" levanta uma mãozinha; "preocupado" e "triste" avisam que os créditos estão acabando
 * ou acabaram (triste chora uma lágrima). As animações param com "reduzir movimento" (mascote.css).
 */
export default function Mascote({ humor = "feliz", size = 96, className = "", animado = true }: { humor?: Humor; size?: number; className?: string; animado?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const triste = humor === "triste", preocupado = humor === "preocupado";
  const boca =
    humor === "pensando" ? <path d="M53 94h14" style={tr(TINTA, 3)} />
    : humor === "surpreso" ? <ellipse cx="60" cy="94" rx="5" ry="6" style={{ fill: TINTA, stroke: "none" }} />
    : triste ? <path d="M49 99c4-9 18-9 22 0" style={tr(TINTA, 3)} />
    : preocupado ? <path d="M50 96q5-5 10 0t10 0" style={tr(TINTA, 3)} />
    : <path d="M50 90c3 9 17 9 20 0" style={tr(TINTA, 3)} />;
  const olhoY = humor === "pensando" ? 77 : triste ? 83 : 80;
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
        <circle cx="93" cy="24" r="5" style={{ fill: LARANJA, stroke: "none", opacity: triste ? 0.45 : 1 }} />
        <g className="cro-olhos">
          <ellipse cx="44" cy={olhoY} rx="5.5" ry="8" style={{ fill: TINTA, stroke: "none" }} />
          <ellipse cx="76" cy={olhoY} rx="5.5" ry="8" style={{ fill: TINTA, stroke: "none" }} />
          <circle cx="46" cy={olhoY - 3} r="2" style={sol} />
          <circle cx="78" cy={olhoY - 3} r="2" style={sol} />
        </g>
        {(triste || preocupado) && (
          <g>
            <path d={triste ? "M36 71l15-5" : "M37 69l13-3"} style={tr(TINTA, 2.6)} />
            <path d={triste ? "M84 71l-15-5" : "M83 66l-13 3"} style={tr(TINTA, 2.6)} />
          </g>
        )}
        <circle cx="35" cy="91" r="5" style={{ fill: "#FF9DB8", stroke: "none", opacity: triste ? 0.25 : 0.55 }} />
        <circle cx="85" cy="91" r="5" style={{ fill: "#FF9DB8", stroke: "none", opacity: triste ? 0.25 : 0.55 }} />
        {boca}
        {triste && <path className="cro-lagrima" d="M40 93c-4 6-4 10 0 10s4-4 0-10z" style={{ fill: AGUA, stroke: "none" }} />}
        {preocupado && <path d="M92 58c-4 6-4 10 0 10s4-4 0-10z" style={{ fill: AGUA, stroke: "none", opacity: 0.9 }} />}
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
