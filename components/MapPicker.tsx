"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";

/**
 * Seletor de local para o mapa de situação: o cliente vê o satélite, posiciona o pino e desenha o lote (pontos que podem ser arrastados).
 * Com NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY (chave do navegador, restrita por site) usa o mapa interativo do Google (arrastar e dar zoom);
 * sem ela usa o satélite estático servido pelo próprio app (a chave do servidor nunca vai ao navegador).
 */
export type Pt = [number, number];
export type Marcacao = { pino: Pt | null; poligono: Pt[] };
type Modo = "mover" | "pino" | "lote";
const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || "";

// projeção Web Mercator (mesma do Google): "mundo" de 256·2^z pixels
const wx = (lon: number, z: number) => ((lon + 180) / 360) * 256 * 2 ** z;
const wy = (lat: number, z: number) => { const s = Math.sin((lat * Math.PI) / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z; };
const lonFromWx = (x: number, z: number) => (x / (256 * 2 ** z)) * 360 - 180;
const latFromWy = (y: number, z: number) => (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (256 * 2 ** z))));

export function areaM2(p: Pt[]): number {
  if (p.length < 3) return 0;
  const ky = 110574, kx = 111320 * Math.cos((p[0][0] * Math.PI) / 180);
  const m = p.map(([la, lo]) => [(lo - p[0][1]) * kx, (la - p[0][0]) * ky]);
  let a = 0;
  for (let i = 0; i < m.length; i++) { const [x1, y1] = m[i], [x2, y2] = m[(i + 1) % m.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}

function StaticPicker({ centro, m, onChange, modo }: { centro: Pt; m: Marcacao; onChange: (m: Marcacao) => void; modo: Modo }) {
  const t = useT();
  const [center, setCenter] = useState<Pt>(centro);
  const [zoom, setZoom] = useState(18);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const st = useRef<{ kind: "pan" | "vertex" | "click"; sx: number; sy: number; moved: boolean; v?: number } | null>(null);

  useEffect(() => { setCenter(centro); setZoom(18); }, [centro]);
  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setUrl(`/api/maps/preview?lat=${center[0].toFixed(6)}&lon=${center[1].toFixed(6)}&zoom=${zoom}`), 250);
    return () => clearTimeout(id);
  }, [center, zoom]);

  const toPx = (p: Pt): [number, number] => [320 + wx(p[1], zoom) - wx(center[1], zoom), 320 + wy(p[0], zoom) - wy(center[0], zoom)];
  const fromPx = (x: number, y: number): Pt => [latFromWy(wy(center[0], zoom) + (y - 320), zoom), lonFromWx(wx(center[1], zoom) + (x - 320), zoom)];
  const local = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) * 640) / r.width, y: ((e.clientY - r.top) * 640) / r.height, k: 640 / r.width }; };

  function down(e: React.PointerEvent<SVGSVGElement>) {
    const p = local(e);
    const v = (e.target as SVGElement).getAttribute("data-v");
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (v != null && modo !== "mover") st.current = { kind: "vertex", sx: p.x, sy: p.y, moved: false, v: +v };
    else st.current = { kind: modo === "mover" ? "pan" : "click", sx: p.x, sy: p.y, moved: false };
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    const s = st.current; if (!s) return;
    const p = local(e);
    if (Math.hypot(p.x - s.sx, p.y - s.sy) > 4) s.moved = true;
    if (s.kind === "pan") setDrag({ dx: p.x - s.sx, dy: p.y - s.sy });
    if (s.kind === "vertex" && s.moved) { const poly = m.poligono.slice(); poly[s.v!] = fromPx(p.x, p.y); onChange({ ...m, poligono: poly }); }
  }
  function up(e: React.PointerEvent<SVGSVGElement>) {
    const s = st.current; st.current = null; if (!s) return;
    const p = local(e);
    if (s.kind === "pan") { if (s.moved) setCenter(fromPx(320 - (p.x - s.sx), 320 - (p.y - s.sy))); setDrag(null); return; }
    if (s.kind === "click" && !s.moved) {
      const pt = fromPx(p.x, p.y);
      if (modo === "pino") onChange({ ...m, pino: pt });
      else if (modo === "lote") onChange({ ...m, poligono: [...m.poligono, pt] });
    }
  }

  const poly = m.poligono.map(toPx);
  const pino = m.pino ? toPx(m.pino) : null;
  return (
    <div>
      <div ref={box} style={{ position: "relative", width: "100%", maxWidth: 640, aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 10, border: "1px solid var(--line)", background: "#222", touchAction: "none", cursor: modo === "mover" ? "grab" : "crosshair" }}>
        <div style={{ position: "absolute", inset: 0, transform: drag ? `translate(${(drag.dx * (box.current?.clientWidth || 640)) / 640}px, ${(drag.dy * (box.current?.clientWidth || 640)) / 640}px)` : undefined }}>
          {url && <img src={url} alt={t("Satélite")} draggable={false} onLoad={() => setLoading(false)} onError={() => setLoading(false)} style={{ width: "100%", height: "100%", display: "block", userSelect: "none", opacity: loading ? 0.6 : 1 }} />}
          <svg viewBox="0 0 640 640" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { st.current = null; setDrag(null); }}>
            {poly.length >= 2 && <polygon points={poly.map((q) => q.join(",")).join(" ")} fill="#d6402f" fillOpacity={poly.length >= 3 ? 0.22 : 0} stroke="#fff" strokeWidth={2.5} strokeDasharray="7 5" strokeLinejoin="round" />}
            {poly.map((q, i) => <circle key={i} data-v={i} cx={q[0]} cy={q[1]} r={7} fill="#d6402f" stroke="#fff" strokeWidth={2.5} style={{ cursor: "move" }} />)}
            {pino && <g transform={`translate(${pino[0]},${pino[1]})`} pointerEvents="none"><path d="M0,0 C-13,-15 -11,-31 0,-31 C11,-31 13,-15 0,0Z" fill="#1976d2" stroke="#fff" strokeWidth={2} /><circle cy={-21} r={4} fill="#fff" /></g>}
          </svg>
        </div>
        {loading && <div style={{ position: "absolute", left: 10, top: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, padding: "3px 9px", borderRadius: 999 }}>{t("Carregando satélite…")}</div>}
        <div style={{ position: "absolute", right: 10, top: 10, display: "grid", gap: 6 }}>
          <button type="button" className="ghost" aria-label={t("Aproximar")} disabled={zoom >= 20} onClick={() => setZoom((z) => Math.min(20, z + 1))} style={{ background: "#fff", color: "#222", padding: "2px 10px", fontSize: 18 }}>+</button>
          <button type="button" className="ghost" aria-label={t("Afastar")} disabled={zoom <= 15} onClick={() => setZoom((z) => Math.max(15, z - 1))} style={{ background: "#fff", color: "#222", padding: "2px 10px", fontSize: 18 }}>−</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Google Maps JavaScript (chave do navegador)
declare global { interface Window { google?: any; __gmapsLoading?: Promise<void> } }
function carregarGoogle(): Promise<void> {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  return (window.__gmapsLoading ??= new Promise<void>((ok, err) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(BROWSER_KEY)}&v=weekly&language=pt-BR&loading=async`;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => { window.__gmapsLoading = undefined; err(new Error("Falha ao carregar o Google Maps")); };
    document.head.appendChild(s);
  }));
}

function GooglePicker({ centro, m, onChange, modo, onFail }: { centro: Pt; m: Marcacao; onChange: (m: Marcacao) => void; modo: Modo; onFail: () => void }) {
  const div = useRef<HTMLDivElement>(null);
  const ref = useRef<{ map?: any; marker?: any; poly?: any }>({});
  const modoRef = useRef(modo); modoRef.current = modo;
  const mRef = useRef(m); mRef.current = m;
  const cbRef = useRef(onChange); cbRef.current = onChange;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregarGoogle();
        const { Map, Polygon } = await window.google.maps.importLibrary("maps");
        const { Marker } = await window.google.maps.importLibrary("marker");
        if (!vivo || !div.current) return;
        const map = new Map(div.current, { center: { lat: centro[0], lng: centro[1] }, zoom: 18, mapTypeId: "hybrid", streetViewControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: "greedy" });
        const marker = new Marker({ map, position: { lat: centro[0], lng: centro[1] }, draggable: true });
        const poly = new Polygon({ map, paths: [], editable: true, strokeColor: "#ffffff", strokeWeight: 3, fillColor: "#d6402f", fillOpacity: 0.25 });
        const lerPoly = (): Pt[] => poly.getPath().getArray().map((p: any) => [p.lat(), p.lng()] as Pt);
        marker.addListener("dragend", () => { const p = marker.getPosition(); cbRef.current({ ...mRef.current, pino: [p.lat(), p.lng()] }); });
        map.addListener("click", (e: any) => {
          const pt: Pt = [e.latLng.lat(), e.latLng.lng()];
          if (modoRef.current === "pino") cbRef.current({ ...mRef.current, pino: pt });
          else if (modoRef.current === "lote") cbRef.current({ ...mRef.current, poligono: [...mRef.current.poligono, pt] });
        });
        const path = poly.getPath();
        for (const ev of ["set_at", "insert_at", "remove_at"]) path.addListener(ev, () => { const novo = lerPoly(); if (JSON.stringify(novo) !== JSON.stringify(mRef.current.poligono)) cbRef.current({ ...mRef.current, poligono: novo }); });
        ref.current = { map, marker, poly };
      } catch { if (vivo) onFail(); }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const r = ref.current; if (r.map) { r.map.panTo({ lat: centro[0], lng: centro[1] }); r.map.setZoom(18); } }, [centro]);
  useEffect(() => { const r = ref.current; if (r.marker && m.pino) r.marker.setPosition({ lat: m.pino[0], lng: m.pino[1] }); }, [m.pino]);
  useEffect(() => {
    const r = ref.current; if (!r.poly) return;
    const atual = r.poly.getPath().getArray().map((p: any) => [p.lat(), p.lng()]);
    if (JSON.stringify(atual) !== JSON.stringify(m.poligono)) r.poly.setPath(m.poligono.map(([la, lo]) => ({ lat: la, lng: lo })));
  }, [m.poligono]);
  useEffect(() => { ref.current.map?.setOptions({ draggableCursor: modo === "mover" ? undefined : "crosshair" }); }, [modo]);

  return <div ref={div} style={{ width: "100%", maxWidth: 760, aspectRatio: "4 / 3", borderRadius: 10, border: "1px solid var(--line)", background: "#222" }} />;
}

export default function MapPicker({ centro, value, onChange }: { centro: Pt; value: Marcacao; onChange: (m: Marcacao) => void }) {
  const t = useT();
  const [modo, setModo] = useState<Modo>("lote");
  const [googleOk, setGoogleOk] = useState(!!BROWSER_KEY);
  const area = areaM2(value.poligono);
  const lotePadrao = () => {
    const [la, lo] = value.pino || centro;
    const dy = 10 / 110574, dx = 10 / (111320 * Math.cos((la * Math.PI) / 180));
    onChange({ ...value, poligono: [[la + dy, lo - dx], [la + dy, lo + dx], [la - dy, lo + dx], [la - dy, lo - dx]] });
  };
  const btn = (m: Modo, label: string) => <button type="button" className={modo === m ? "chip on" : "chip"} aria-pressed={modo === m} onClick={() => setModo(m)}>{t(label)}</button>;
  return (
    <div className="field">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 10px" }}>
        {btn("lote", "Desenhar o lote")}{btn("pino", "Mover o pino")}{btn("mover", "Mover o mapa")}
      </div>
      {googleOk
        ? <GooglePicker centro={centro} m={value} onChange={onChange} modo={modo} onFail={() => setGoogleOk(false)} />
        : <StaticPicker centro={centro} m={value} onChange={onChange} modo={modo} />}
      <p className="small muted" style={{ margin: "8px 2px" }}>
        {modo === "lote" ? t("Toque nos cantos do terreno, na ordem. Arraste um ponto para ajustar.") : modo === "pino" ? t("Toque no mapa para colocar o pino no local certo.") : t("Arraste o mapa. Use + e − para o zoom.")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button type="button" className="ghost" disabled={!value.poligono.length} onClick={() => onChange({ ...value, poligono: value.poligono.slice(0, -1) })}>{t("Desfazer ponto")}</button>
        <button type="button" className="ghost" disabled={!value.poligono.length} onClick={() => onChange({ ...value, poligono: [] })}>{t("Limpar lote")}</button>
        <button type="button" className="ghost" onClick={lotePadrao}>{t("Lote de 20 × 20 m no pino")}</button>
        <span className="small muted">{value.poligono.length >= 3 ? `${t("Lote")}: ${Math.round(area).toLocaleString("pt-BR")} m² · ${value.poligono.length} ${t("pontos")}` : t("Marque ao menos 3 pontos para o lote.")}</span>
      </div>
    </div>
  );
}
