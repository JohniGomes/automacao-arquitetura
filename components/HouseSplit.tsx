"use client";
import { useRef, useState } from "react";

/**
 * Mesma casa em duas fotos com o mesmo enquadramento: modelo 3D à esquerda, render à direita.
 * Arraste (mouse ou toque) ou use as setas do teclado para mover a divisão.
 */
export default function HouseSplit({ className = "" }: { className?: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(97, Math.max(3, ((x - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={box}
      className={`house ${className}`}
      role="slider"
      tabIndex={0}
      aria-label="Comparar o modelo 3D com o render: arraste para os lados"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (dragging.current) move(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); setPos((p) => Math.max(3, p - 4)); }
        if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => Math.min(97, p + 4)); }
      }}
    >
      <img className="layer wire" src="/casa/modelo.jpg" alt="Modelo 3D da casa" draggable={false} />
      <img className="layer real" src="/casa/render.jpg" alt="Render da casa" draggable={false} style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
      <div className="seam" style={{ left: `${pos}%` }}>
        <span className="knob">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></svg>
        </span>
      </div>
      <span className="tg l">Modelo 3D</span>
      <span className="tg r">Render</span>
    </div>
  );
}
