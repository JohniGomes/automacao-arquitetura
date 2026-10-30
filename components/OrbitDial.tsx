"use client";
import { useRef } from "react";
import { useT } from "./I18nProvider";

/**
 * Vista de cima da órbita da câmera: arraste a câmera ao redor da casa (0° = frente).
 * Valores de -180 a 180; negativo = esquerda, positivo = direita.
 */
export default function OrbitDial({ value, onChange }: { value: number; onChange: (deg: number) => void }) {
  const t = useT();
  const box = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const R = 62, C = 80;
  const rad = (value * Math.PI) / 180;
  const cx = C + R * Math.sin(rad), cy = C + R * Math.cos(rad);

  const set = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    onChange(Math.round((Math.atan2(dx, dy) * 180) / Math.PI / 5) * 5);
  };

  return (
    <svg ref={box} viewBox="0 0 160 160" className="dial" role="slider" tabIndex={0} aria-label={t("Giro da câmera")} aria-valuemin={-180} aria-valuemax={180} aria-valuenow={value}
      onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); set(e); }}
      onPointerMove={(e) => drag.current && set(e)} onPointerUp={() => (drag.current = false)} onPointerCancel={() => (drag.current = false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); onChange(Math.max(-180, value - 5)); }
        if (e.key === "ArrowRight") { e.preventDefault(); onChange(Math.min(180, value + 5)); }
      }}>
      <circle cx={C} cy={C} r={R} className="dring" />
      <rect x={C - 20} y={C - 20} width="40" height="40" rx="6" className="dhouse" />
      <path d={`M${C} ${C - 6} l8 12 h-16 z`} className="dnorth" transform={`rotate(180 ${C} ${C})`} />
      <line x1={C} y1={C + 20} x2={cx} y2={cy} className="dline" />
      <circle cx={cx} cy={cy} r="11" className="dcam" />
      <text x={C} y="12" textAnchor="middle" className="dtxt">costas</text>
      <text x={C} y="156" textAnchor="middle" className="dtxt">frente</text>
    </svg>
  );
}
