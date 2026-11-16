import sharp from "sharp";
import { LatLon, XY, Way, polygonStats, pointInPolygon, projector, quadrasDeVias } from "./geo";
import { distM, escolherLugares, GRUPOS, OsmEl, Poi } from "./dados";

/**
 * Prancha do MAPA DE SITUAÇÃO, desenhada por código (sem IA): lote em destaque, endereço, norte, sistema viário com nomes,
 * quadras, edificações vizinhas, referências urbanas numeradas, escala gráfica e legenda. O texto das ruas é girado à mão
 * porque o renderizador de SVG do sharp (librsvg) não suporta <textPath>.
 */
export type Endereco = { logradouro?: string; numero?: string; quadra?: string; bairro?: string; cidade?: string; uf?: string; cep?: string };
/** Marca do escritório na prancha: logo e nome (básica) ou também responsável técnico e cor de destaque (completa). `logo` é um data URI PNG. */
export type Marca = { nivel: "basica" | "completa"; nome?: string; logo?: string; responsavel?: string; registro?: string; cor?: string };
export type PranchaIn = { polygon: LatLon[]; raio: number; endereco: Endereco; base: OsmEl[]; pois: Poi[]; fonte: "osm" | "google"; marca?: Marca };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "Segoe UI, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
const SERIF = "Georgia, DejaVu Serif, Liberation Serif, Times New Roman, serif";
const fmtDist = (d: number) => (d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1).replace(".", ",")} km`);
const fmtNum = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtM = (n: number) => n.toFixed(1).replace(".", ",");

const CLASSES: Record<string, [number, string, string]> = {
  motorway: [10, "#f1c27a", "#c9993f"], motorway_link: [6, "#f1c27a", "#c9993f"], trunk: [9, "#f6d9a0", "#c9a561"], trunk_link: [6, "#f6d9a0", "#c9a561"],
  primary: [8, "#fbe9bf", "#cdb67f"], primary_link: [5, "#fbe9bf", "#cdb67f"], secondary: [6.5, "#ffffff", "#b9b09f"], secondary_link: [4, "#ffffff", "#b9b09f"],
  tertiary: [5.5, "#ffffff", "#b9b09f"], tertiary_link: [4, "#ffffff", "#b9b09f"], residential: [4.2, "#ffffff", "#c6bfb0"], unclassified: [4.2, "#ffffff", "#c6bfb0"], living_street: [3.6, "#ffffff", "#c6bfb0"],
};
const ORDEM = ["living_street", "unclassified", "residential", "tertiary_link", "tertiary", "secondary_link", "secondary", "primary_link", "primary", "trunk_link", "trunk", "motorway_link", "motorway"];

const W = 2100, H = 1500, MX = 40, MY = 40, MW = 1400, MH = 1420;

export function montarPrancha(inp: PranchaIn): string {
  const raio = inp.raio;
  const S = (MW / 2) / raio; // pixels por metro
  const CX = MX + MW / 2, CY = MY + MH / 2;

  // o centro da prancha é o centro do lote
  const lat0 = inp.polygon.reduce((s, p) => s + p[0], 0) / inp.polygon.length;
  const lon0 = inp.polygon.reduce((s, p) => s + p[1], 0) / inp.polygon.length;
  const pj = projector(lat0, lon0);
  const loteM = inp.polygon.map(([la, lo]) => pj.toM(la, lo));
  const est = polygonStats(loteM);
  const px = ([x, y]: XY): XY => [CX + (x - est.centroid[0]) * S, CY - (y - est.centroid[1]) * S];
  const P = (lat: number, lon: number): XY => px(pj.toM(lat, lon));
  const ptsStr = (g: { lat: number; lon: number }[]) => g.map((q) => P(q.lat, q.lon).map((v) => v.toFixed(1)).join(",")).join(" ");
  const ptsXY = (poly: XY[]) => poly.map((q) => px(q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const dentroMapa = (p: XY, folga = 0) => p[0] > MX + folga && p[0] < MX + MW - folga && p[1] > MY + folga && p[1] < MY + MH - folga;

  const vias = inp.base.filter((e) => e.tags?.highway && CLASSES[e.tags.highway] && e.geometry && e.nodes);
  const ways: Way[] = vias.map((w) => ({ highway: w.tags!.highway, nodes: w.nodes!, pts: w.geometry!.map((q) => pj.toM(q.lat, q.lon)) }));
  const faces = quadrasDeVias(ways);
  const faceDoLote = faces.filter((f) => pointInPolygon(est.centroid, f.poly)).sort((a, b) => Math.abs(a.area) - Math.abs(b.area))[0];

  // ---------------- mapa ----------------
  let mapa = "";
  for (const e of inp.base) {
    const t = e.tags || {};
    if (e.geometry && (t.leisure || t.landuse || t.natural === "water")) mapa += `<polygon points="${ptsStr(e.geometry)}" fill="${t.natural === "water" ? "#bcd6ea" : "#dcead0"}"/>`;
  }
  for (const e of inp.base) if (e.tags?.waterway && e.geometry) mapa += `<polyline points="${ptsStr(e.geometry)}" fill="none" stroke="#bcd6ea" stroke-width="3"/>`;
  for (const f of faces) mapa += `<polygon points="${ptsXY(f.poly)}" fill="${f === faceDoLote ? "#f7e4df" : "#f1eee6"}"/>`;
  for (const e of inp.base) if (e.tags?.building && e.geometry) mapa += `<polygon points="${ptsStr(e.geometry)}" fill="#cfc8ba" stroke="#a9a190" stroke-width="0.8"/>`;
  for (const passo of [1, 0]) for (const c of ORDEM) {
    const g = vias.filter((v) => v.tags!.highway === c);
    if (!g.length) continue;
    const [w, fill, borda] = CLASSES[c];
    mapa += `<g fill="none" stroke="${passo ? borda : fill}" stroke-width="${passo ? w + 1.6 : w}" stroke-linecap="round" stroke-linejoin="round">${g.map((e) => `<polyline points="${ptsStr(e.geometry!)}"/>`).join("")}</g>`;
  }

  // nomes das vias: trecho reto mais longo de cada rua, texto girado, sem encostar em outro nome
  const colocados: { x: number; y: number; w: number }[] = [];
  const candidatos = vias.filter((v) => v.tags!.name).map((v) => {
    const pts = v.geometry!.map((q) => P(q.lat, q.lon));
    let best: { len: number; a: XY; b: XY; mid: XY } | null = null;
    let i = 0;
    while (i < pts.length - 1) {
      let j = i + 1, len = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
      const a0 = Math.atan2(pts[j][1] - pts[i][1], pts[j][0] - pts[i][0]);
      while (j < pts.length - 1) {
        let d = Math.atan2(pts[j + 1][1] - pts[j][1], pts[j + 1][0] - pts[j][0]) - a0;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > 0.22) break;
        len += Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]);
        j++;
      }
      if (!best || len > best.len) best = { len, a: pts[i], b: pts[j], mid: [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2] };
      i = j;
    }
    return { nome: v.tags!.name, best };
  }).filter((c) => c.best).sort((a, b) => b.best!.len - a.best!.len);
  let nomes = "";
  const usados = new Set<string>();
  for (const c of candidatos) {
    if (usados.has(c.nome) || colocados.length >= 42) continue;
    const w = c.nome.length * 7.2 + 14, b = c.best!;
    if (b.len < w + 10 || !dentroMapa(b.mid, 70)) continue;
    if (colocados.some((o) => Math.hypot(o.x - b.mid[0], o.y - b.mid[1]) < (o.w + w) / 2 * 0.8)) continue;
    let ang = (Math.atan2(b.b[1] - b.a[1], b.b[0] - b.a[0]) * 180) / Math.PI;
    if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
    nomes += `<text transform="translate(${b.mid[0].toFixed(1)},${b.mid[1].toFixed(1)}) rotate(${ang.toFixed(1)})" text-anchor="middle" dy="4" font-size="13" fill="#4a463d" stroke="#fff" stroke-width="3.2" paint-order="stroke" letter-spacing="0.4">${esc(c.nome)}</text>`;
    usados.add(c.nome); colocados.push({ x: b.mid[0], y: b.mid[1], w });
  }
  mapa += nomes;

  // rótulo da quadra do lote
  const loteVerts = loteM.map(px);
  let rotuloQuadra = "";
  const quadraNum = (inp.endereco.quadra || "").trim();
  if (faceDoLote) {
    mapa += `<polygon points="${ptsXY(faceDoLote.poly)}" fill="none" stroke="#d6402f" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>`;
    if (quadraNum) {
      const fx = faceDoLote.poly.map(px);
      const xs = fx.map((p) => p[0]), ys = fx.map((p) => p[1]);
      let melhor = null as { x: number; y: number; d: number } | null;
      for (const folga of [60, 40, 25, 0]) {
        for (let x = Math.min(...xs); x <= Math.max(...xs); x += 8) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 8) {
          if (!pointInPolygon([x, y], fx) || pointInPolygon([x, y], loteVerts) || !dentroMapa([x, y], 70)) continue;
          const d = Math.min(...loteVerts.map((p) => Math.hypot(p[0] - x, p[1] - y)));
          if (d >= folga && (!melhor || d > melhor.d)) melhor = { x, y, d };
        }
        if (melhor) break;
      }
      if (melhor) rotuloQuadra = `<g transform="translate(${melhor.x.toFixed(1)},${melhor.y.toFixed(1)})"><rect x="-58" y="-17" width="116" height="30" rx="5" fill="#fff" stroke="#d6402f" stroke-width="1.6"/><text y="4" font-size="16" font-weight="700" fill="#d6402f" text-anchor="middle">QUADRA ${esc(quadraNum.slice(0, 8))}</text></g>`;
    }
  }

  // lote em destaque, medidas das testadas e rótulo
  const lx = loteVerts.map((p) => p[0]), ly = loteVerts.map((p) => p[1]);
  const minDim = Math.min(Math.max(...lx) - Math.min(...lx), Math.max(...ly) - Math.min(...ly));
  const cLote: XY = [CX, CY];
  let loteSvg = `<defs><pattern id="hach" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="11" stroke="#d6402f" stroke-width="2.4"/></pattern></defs>
<polygon points="${loteVerts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="url(#hach)" fill-opacity="0.55"/>
<polygon points="${loteVerts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#d6402f" stroke-width="4" stroke-linejoin="round"/>`;
  loteVerts.forEach((p, i) => {
    const q = loteVerts[(i + 1) % loteVerts.length];
    const lado = est.sides[i];
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 70) return; // lado curto demais: a medida fica só no painel
    const m: XY = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy) || 1;
    const ox = (dy / n) * 20, oy = (-dx / n) * 20;
    const fora = Math.hypot(m[0] + ox - cLote[0], m[1] + oy - cLote[1]) > Math.hypot(m[0] - ox - cLote[0], m[1] - oy - cLote[1]) ? 1 : -1;
    loteSvg += `<text x="${(m[0] + fora * ox).toFixed(1)}" y="${(m[1] + fora * oy + 4).toFixed(1)}" font-size="14" font-weight="700" fill="#a82a1c" stroke="#fff" stroke-width="3.5" paint-order="stroke" text-anchor="middle">${fmtM(lado)} m</text>`;
  });
  const grande = minDim >= 130;
  const bx = cLote[0] - (grande ? 20 : 0), by = grande ? cLote[1] - 40 : Math.min(...ly) - 46;
  loteSvg += (grande ? "" : `<line x1="${bx.toFixed(1)}" y1="${(by + 22).toFixed(1)}" x2="${cLote[0].toFixed(1)}" y2="${Math.min(...ly).toFixed(1)}" stroke="#d6402f" stroke-width="2.5"/>`) +
    `<g transform="translate(${bx.toFixed(1)},${by.toFixed(1)})"><rect x="-62" y="-22" width="124" height="44" rx="6" fill="#d6402f" stroke="#fff" stroke-width="2"/><text y="-3" font-size="17" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="1.5">LOTE</text><text y="14" font-size="12" fill="#fff" text-anchor="middle">${fmtNum(est.area)} m² aprox.</text></g>`;

  // ---------------- referências urbanas ----------------
  const centro: LatLon = pj.toGeo(est.centroid[0], est.centroid[1]);
  const escolhidos = escolherLugares(inp.pois, centro, raio).map((p, i) => {
    const [x, y] = P(p.lat, p.lon);
    return { ...p, n: i + 1, rx: x, ry: y, x, y, nome: p.nome || GRUPOS[p.grupo].nome };
  }).filter((p) => dentroMapa([p.rx, p.ry], 30));
  escolhidos.forEach((p, i) => { p.n = i + 1; });
  for (let it = 0; it < 60; it++) for (let i = 0; i < escolhidos.length; i++) for (let j = i + 1; j < escolhidos.length; j++) {
    const a = escolhidos[i], b = escolhidos[j];
    let dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.01;
    if (d < 40) { const k = (40 - d) / 2; dx /= d; dy /= d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
  }
  let poiSvg = "";
  for (const p of escolhidos) {
    const cor = GRUPOS[p.grupo].cor;
    if (Math.hypot(p.x - p.rx, p.y - p.ry) > 3) poiSvg += `<line x1="${p.rx.toFixed(1)}" y1="${p.ry.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${cor}" stroke-width="2"/><circle cx="${p.rx.toFixed(1)}" cy="${p.ry.toFixed(1)}" r="3.5" fill="${cor}"/>`;
    poiSvg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="16" fill="${cor}" stroke="#fff" stroke-width="3"/><text x="${p.x.toFixed(1)}" y="${(p.y + 5.5).toFixed(1)}" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${p.n}</text>`;
  }

  // ---------------- norte, escala ----------------
  const norte = `<g transform="translate(${MX + MW - 80},${MY + 100})"><circle r="38" fill="#fff" stroke="#8a8372" stroke-width="1.5"/><path d="M0,-30 L12,14 L0,6 L-12,14 Z" fill="#2b2822"/><text y="-44" font-size="22" font-weight="700" text-anchor="middle" fill="#2b2822">N</text></g>`;
  const nice = [20, 40, 100, 200, 400, 1000, 2000];
  const L = nice.find((v) => v * S >= 160 && v * S <= 360) ?? nice[nice.length - 1];
  const barW = L * S;
  const escala = (x: number, y: number) => {
    const seg = barW / 4;
    let s = `<g transform="translate(${x},${y})">`;
    for (let i = 0; i < 4; i++) s += `<rect x="${(i * seg).toFixed(1)}" width="${seg.toFixed(1)}" height="9" fill="${i % 2 ? "#fff" : "#2b2822"}" stroke="#2b2822"/>`;
    for (let i = 0; i <= 4; i++) s += `<text x="${(i * seg).toFixed(1)}" y="-6" font-size="13" text-anchor="${i === 4 ? "start" : "middle"}" fill="#2b2822">${i === 4 ? `${L} m` : Math.round((L * i) / 4)}</text>`;
    return s + "</g>";
  };

  // ---------------- painel lateral ----------------
  const e = inp.endereco;
  const PXL = MX + MW + 40, PW = W - PXL - 40;
  const ACENTO = inp.marca?.nivel === "completa" && /^#[0-9a-f]{6}$/i.test(inp.marca.cor || "") ? inp.marca.cor! : "#d6402f";
  let y = 52, pn = "";
  if (inp.marca && (inp.marca.logo || inp.marca.nome)) {
    if (inp.marca.logo) { pn += `<image href="${inp.marca.logo}" x="${PXL}" y="${y - 22}" width="300" height="70" preserveAspectRatio="xMinYMid meet"/>`; y += 58; }
    if (inp.marca.nome) { pn += `<text x="${PXL}" y="${y + 6}" font-size="21" font-weight="700" fill="#1f1d1a">${esc(inp.marca.nome)}</text>`; y += 34; }
    pn += `<line x1="${PXL}" y1="${y}" x2="${PXL + PW}" y2="${y}" stroke="#ddd6c8"/>`; y += 34;
  }
  const sec = (t: string) => { y += 10; pn += `<text x="${PXL}" y="${y}" font-size="12.5" letter-spacing="2.2" font-weight="700" fill="${ACENTO}">${t}</text><line x1="${PXL}" y1="${y + 8}" x2="${PXL + PW}" y2="${y + 8}" stroke="#ddd6c8"/>`; y += 30; };
  const lin = (t: string, o: { x?: number; s?: number; b?: boolean; c?: string; h?: number } = {}) => { pn += `<text x="${PXL + (o.x || 0)}" y="${y}" font-size="${o.s || 16}" ${o.b ? 'font-weight="700"' : ""} fill="${o.c || "#1f1d1a"}">${esc(t)}</text>`; y += o.h || 23; };
  const titulo = [e.logradouro, quadraNum ? `Qd. ${quadraNum}` : ""].filter(Boolean).join(", ") || "Mapa de situação";
  pn += `<text x="${PXL}" y="${y}" font-size="14" letter-spacing="4" font-weight="700" fill="${ACENTO}">MAPA DE SITUAÇÃO</text>`; y += 38;
  pn += `<text x="${PXL}" y="${y}" font-size="${titulo.length > 28 ? 24 : 30}" font-family="${SERIF}" fill="#1f1d1a">${esc(titulo)}</text>`; y += 12;
  sec("1 · IDENTIFICAÇÃO DO LOTE");
  pn += `<rect x="${PXL}" y="${y - 16}" width="34" height="22" fill="url(#hach)" fill-opacity="0.7" stroke="#d6402f" stroke-width="3"/>`; lin("Lote do projeto (destacado em vermelho)", { x: 48 });
  lin(`${quadraNum ? `Quadra ${quadraNum} · ` : ""}área aprox. ${fmtNum(est.area)} m² · perímetro ${fmtNum(est.perimeter)} m`, { s: 14.5, c: "#4b463d" });
  lin(`Testadas (m): ${est.sides.map(fmtM).join(" · ")}`, { s: 14.5, c: "#4b463d" });
  sec("2 · ENDEREÇO");
  lin(`${e.logradouro || "Logradouro não informado"}, nº ${e.numero || "s/n"}`, { b: true });
  lin([e.bairro, [e.cidade, e.uf].filter(Boolean).join(" – ")].filter(Boolean).join(" · ") || "Bairro e cidade não informados");
  lin(`${e.cep ? `CEP ${e.cep} · ` : ""}lat/lon ${centro[0].toFixed(5)}, ${centro[1].toFixed(5)}`, { s: 14, c: "#6b655a" });
  sec("3 · NORTE GEOGRÁFICO");
  lin("Norte para cima do desenho (seta no canto do mapa).", { s: 15, c: "#4b463d" });
  sec("4 · SISTEMA VIÁRIO");
  const amostra = (cor: string, borda: string, w: number, t: string) => { pn += `<line x1="${PXL}" y1="${y - 5}" x2="${PXL + 44}" y2="${y - 5}" stroke="${borda}" stroke-width="${w + 1.6}" stroke-linecap="round"/><line x1="${PXL}" y1="${y - 5}" x2="${PXL + 44}" y2="${y - 5}" stroke="${cor}" stroke-width="${w}" stroke-linecap="round"/>`; lin(t, { x: 60, s: 15, h: 24 }); };
  amostra("#f1c27a", "#c9993f", 9, "Rodovia / via expressa"); amostra("#fff", "#b9b09f", 6, "Avenida / via coletora"); amostra("#fff", "#c6bfb0", 4, "Rua local");
  sec("5 · QUADRAS");
  pn += `<rect x="${PXL}" y="${y - 15}" width="44" height="20" fill="#f7e4df" stroke="#d6402f" stroke-dasharray="3 5" stroke-width="2"/>`; lin(quadraNum ? `Quadra do lote (nº ${quadraNum}, informada)` : "Quadra do lote", { x: 60, s: 15 });
  pn += `<rect x="${PXL}" y="${y - 15}" width="44" height="20" fill="#f1eee6" stroke="#c6bfb0"/>`; lin("Demais quadras (numeração depende de cadastro)", { x: 60, s: 15 });
  sec("6 · LOTES VIZINHOS");
  pn += `<rect x="${PXL}" y="${y - 15}" width="44" height="20" fill="#cfc8ba" stroke="#a9a190"/>`; lin("Edificações mapeadas no entorno", { x: 60, s: 15 });
  lin("Divisão dos lotes: sem dado cadastral disponível", { s: 14.5, c: "#6b655a" });
  sec("7 · REFERÊNCIAS URBANAS");
  if (!escolhidos.length) lin("Nenhum local de referência encontrado nesta base.", { s: 15, c: "#6b655a" });
  for (const p of escolhidos) {
    const nome = p.nome.length > 36 ? p.nome.slice(0, 35) + "…" : p.nome;
    pn += `<circle cx="${PXL + 14}" cy="${y - 5}" r="12" fill="${GRUPOS[p.grupo].cor}"/><text x="${PXL + 14}" y="${y}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${p.n}</text><text x="${PXL + 36}" y="${y}" font-size="15.5" fill="#1f1d1a">${esc(nome)}</text><text x="${PXL + PW}" y="${y}" font-size="15.5" fill="#6b655a" text-anchor="end">${fmtDist(distM(centro, p.lat, p.lon))}</text>`;
    y += 25;
  }
  sec("8 · ESCALA GRÁFICA");
  pn += escala(PXL, y + 6); y += 28;
  sec("9 · LEGENDA");
  const cats = [...new Map(escolhidos.map((p) => [GRUPOS[p.grupo].nome, GRUPOS[p.grupo].cor])).entries()];
  let lgx = PXL, lgy = y;
  for (const [nome, cor] of cats) {
    const w = 28 + nome.length * 7.6;
    if (lgx + w > PXL + PW) { lgx = PXL; lgy += 24; }
    pn += `<circle cx="${lgx + 8}" cy="${lgy - 5}" r="7" fill="${cor}"/><text x="${lgx + 22}" y="${lgy}" font-size="14" fill="#4b463d">${esc(nome)}</text>`;
    lgx += w;
  }
  if (inp.marca?.nivel === "completa" && (inp.marca.responsavel || inp.marca.registro)) {
    y = lgy + 24;
    sec("RESPONSÁVEL TÉCNICO");
    if (inp.marca.responsavel) lin(inp.marca.responsavel, { b: true });
    if (inp.marca.registro) lin(inp.marca.registro, { s: 14.5, c: "#4b463d" });
  }
  const fonte = inp.fonte === "google" ? "Base: © colaboradores do OpenStreetMap (ODbL). Locais: Google Places." : "Base e locais: © colaboradores do OpenStreetMap (ODbL).";
  pn += `<text x="${PXL}" y="${H - 66}" font-size="12" fill="#8a8372">${esc(fonte)}</text>
<text x="${PXL}" y="${H - 48}" font-size="12" fill="#8a8372">Desenho esquemático, sem valor cadastral ou legal. Conferir com a prefeitura.</text>
<text x="${PXL}" y="${H - 30}" font-size="12" fill="#8a8372">Distâncias em linha reta a partir do centro do lote.</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<rect width="${W}" height="${H}" fill="#fbfaf6"/>
<defs><clipPath id="cm"><rect x="${MX}" y="${MY}" width="${MW}" height="${MH}"/></clipPath></defs>
<g clip-path="url(#cm)"><rect x="${MX}" y="${MY}" width="${MW}" height="${MH}" fill="#f4f1ea"/>${mapa}${loteSvg}${rotuloQuadra}${poiSvg}${norte}
<rect x="${MX + 20}" y="${MY + MH - 70}" width="${Math.max(270, barW + 70)}" height="52" rx="6" fill="#fff" fill-opacity="0.9"/>${escala(MX + 40, MY + MH - 40)}</g>
<rect x="${MX}" y="${MY}" width="${MW}" height="${MH}" fill="none" stroke="#2b2822" stroke-width="2"/>
${pn}</svg>`;
}

/** SVG → PNG (a prancha tem 2100×1500 px). */
export async function renderPrancha(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 96 }).png({ compressionLevel: 9 }).toBuffer();
}
