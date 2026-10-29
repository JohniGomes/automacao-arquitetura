"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Stroke = { pts: [number, number][]; size: number };
export type Region = { id: string; kind: "rect" | "brush"; rect?: { x: number; y: number; w: number; h: number }; strokes: Stroke[]; text: string };

/** Cores das regiões (da paleta, com bom contraste sobre fotos). */
export const REGION_COLORS = ["#d4577a", "#3c8cc8", "#f0aa32", "#5aaa6e", "#9664c8"];

const norm = (e: React.PointerEvent<HTMLCanvasElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))] as [number, number];
};

function paintShape(ctx: CanvasRenderingContext2D, r: Region, W: number, H: number, style: string | CanvasGradient) {
  ctx.fillStyle = style; ctx.strokeStyle = style;
  if (r.kind === "rect" && r.rect) ctx.fillRect(r.rect.x * W, r.rect.y * H, r.rect.w * W, r.rect.h * H);
  for (const s of r.strokes) {
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(2, s.size * W);
    ctx.beginPath();
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * W + 0.01, s.pts[0][1] * H);
    ctx.stroke();
  }
}

/** Máscara da região (branco = área editável) no tamanho da imagem, limitado a 1536 px de largura. */
export function buildMask(r: Region, natW: number, natH: number): Promise<Blob> {
  const scale = Math.min(1, 1536 / natW);
  const W = Math.round(natW * scale), H = Math.round(natH * scale);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  paintShape(ctx, r, W, H, "#fff");
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Não foi possível criar a máscara."))), "image/png"));
}

/**
 * Imagem com camada de desenho: retângulo ou pincel marcam regiões, cada uma numerada e colorida.
 * Pincel: com uma região de pincel ativa, os novos traços entram nela; "Nova região" começa outra.
 */
export default function EditorCanvas({ src, regions, active, tool, brush, onChange, onSize, max }: {
  src: string; regions: Region[]; active: string | null; tool: "rect" | "brush"; brush: number; max: number;
  onChange: (regions: Region[], active: string | null) => void; onSize: (w: number, h: number) => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const draft = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const stroking = useRef<{ id: string } | null>(null);
  const [tick, setTick] = useState(0);

  const draw = useCallback(() => {
    const c = cv.current, im = img.current;
    if (!c || !im) return;
    const W = im.clientWidth, H = im.clientHeight;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    regions.forEach((r, i) => {
      const col = REGION_COLORS[i % REGION_COLORS.length];
      ctx.globalAlpha = r.id === active ? 0.55 : 0.38;
      paintShape(ctx, r, W, H, col);
      ctx.globalAlpha = 1;
      // contorno e número
      ctx.strokeStyle = col; ctx.lineWidth = r.id === active ? 3 : 2;
      let bx = 0, by = 0;
      if (r.kind === "rect" && r.rect) { ctx.strokeRect(r.rect.x * W, r.rect.y * H, r.rect.w * W, r.rect.h * H); bx = r.rect.x * W; by = r.rect.y * H; }
      else if (r.strokes[0]) { bx = r.strokes[0].pts[0][0] * W; by = r.strokes[0].pts[0][1] * H; }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + 12, by + 12, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "600 13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), bx + 12, by + 12.5);
    });
    const d = draft.current;
    if (d) { ctx.setLineDash([6, 4]); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(Math.min(d.x0, d.x1) * W, Math.min(d.y0, d.y1) * H, Math.abs(d.x1 - d.x0) * W, Math.abs(d.y1 - d.y0) * H); ctx.setLineDash([]); }
  }, [regions, active]);

  useEffect(() => { draw(); }, [draw, tick]);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = norm(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "rect") {
      if (regions.length >= max) return;
      draft.current = { x0: x, y0: y, x1: x, y1: y };
    } else {
      const cur = regions.find((r) => r.id === active && r.kind === "brush");
      const stroke: Stroke = { pts: [[x, y]], size: brush };
      if (cur) { stroking.current = { id: cur.id }; onChange(regions.map((r) => (r.id === cur.id ? { ...r, strokes: [...r.strokes, stroke] } : r)), cur.id); }
      else {
        if (regions.length >= max) return;
        const id = Math.random().toString(36).slice(2, 9);
        stroking.current = { id };
        onChange([...regions, { id, kind: "brush", strokes: [stroke], text: "" }], id);
      }
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = norm(e);
    if (draft.current) { draft.current.x1 = x; draft.current.y1 = y; draw(); }
    else if (stroking.current) {
      const id = stroking.current.id;
      onChange(regions.map((r) => (r.id === id ? { ...r, strokes: r.strokes.map((s, i) => (i === r.strokes.length - 1 ? { ...s, pts: [...s.pts, [x, y]] } : s)) } : r)), id);
    }
  };
  const up = () => {
    const d = draft.current;
    draft.current = null; stroking.current = null;
    if (d) {
      const rect = { x: Math.min(d.x0, d.x1), y: Math.min(d.y0, d.y1), w: Math.abs(d.x1 - d.x0), h: Math.abs(d.y1 - d.y0) };
      if (rect.w > 0.01 && rect.h > 0.01) {
        const id = Math.random().toString(36).slice(2, 9);
        onChange([...regions, { id, kind: "rect", rect, strokes: [], text: "" }], id);
      } else draw();
    }
  };

  return (
    <div className="ecanvas">
      <img ref={img} src={src} alt="Imagem a editar" draggable={false}
        onLoad={(e) => { onSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight); setTick((t) => t + 1); }} />
      <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Desenhe sobre a imagem para marcar as regiões" />
    </div>
  );
}
