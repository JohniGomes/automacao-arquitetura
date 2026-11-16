import { LatLon, XY, Way, polygonStats, pointInPolygon, projector, quadrasDeVias } from "./geo";
import { escolherLugares, GRUPOS } from "./dados";
import type { PranchaIn } from "./prancha";

/**
 * Exportação do mapa de situação em DXF (ASCII, formato R12, que o AutoCAD e os outros programas de CAD abrem), em metros,
 * com coordenadas UTM SIRGAS 2000 (a zona sai da longitude do lote), em camadas: lote, quadras, vias, edificações,
 * verde e água, lugares, nomes e título. O desenho é esquemático, como a prancha.
 */

/** Latitude/longitude (graus) → UTM (zona automática, hemisfério pela latitude). Séries de Krüger, elipsoide GRS80 (SIRGAS 2000). */
export function utm(lat: number, lon: number) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, n = f / (2 - f);
  const zona = Math.floor((lon + 180) / 6) + 1, lon0 = ((zona - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const A = (a / (1 + n)) * (1 + (n * n) / 4 + n ** 4 / 64);
  const al = [n / 2 - (2 * n * n) / 3 + (5 * n ** 3) / 16, (13 * n * n) / 48 - (3 * n ** 3) / 5, (61 * n ** 3) / 240];
  const p = lat * (Math.PI / 180), dl = lon * (Math.PI / 180) - lon0;
  const c = (2 * Math.sqrt(n)) / (1 + n);
  const t = Math.sinh(Math.atanh(Math.sin(p)) - c * Math.atanh(c * Math.sin(p)));
  const xi0 = Math.atan(t / Math.cos(dl)), eta0 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
  let xi = xi0, eta = eta0;
  for (let j = 1; j <= 3; j++) { xi += al[j - 1] * Math.sin(2 * j * xi0) * Math.cosh(2 * j * eta0); eta += al[j - 1] * Math.cos(2 * j * xi0) * Math.sinh(2 * j * eta0); }
  return { zona, sul: lat < 0, e: 500000 + k0 * A * eta, n: (lat < 0 ? 10_000_000 : 0) + k0 * A * xi };
}

const CAMADAS: [string, number][] = [
  ["LOTE", 1], ["COTAS_LOTE", 1], ["QUADRA_LOTE", 1], ["QUADRAS", 8], ["VIAS_RODOVIA", 30], ["VIAS_AVENIDA", 7], ["VIAS_LOCAL", 9],
  ["EDIFICACOES", 8], ["VERDE", 3], ["AGUA", 5], ["LUGARES", 6], ["NOMES_VIAS", 7], ["TITULO", 7], ["NORTE", 7],
];
const VIA_CAMADA: Record<string, string> = {
  motorway: "VIAS_RODOVIA", motorway_link: "VIAS_RODOVIA", trunk: "VIAS_RODOVIA", trunk_link: "VIAS_RODOVIA", primary: "VIAS_AVENIDA", primary_link: "VIAS_AVENIDA",
  secondary: "VIAS_AVENIDA", secondary_link: "VIAS_AVENIDA", tertiary: "VIAS_AVENIDA", tertiary_link: "VIAS_AVENIDA",
  residential: "VIAS_LOCAL", unclassified: "VIAS_LOCAL", living_street: "VIAS_LOCAL",
};

const g = (code: number, val: string | number) => `${code}\n${val}\n`;
const num = (v: number) => v.toFixed(3);
/** DXF R12 usa a página de código ANSI 1252: o que não cabe nela vira hífen (e o texto é gravado em latin1). */
const txt = (s: string) => s.replace(/[^\x20-\xFF]/g, "-").replace(/[\r\n]+/g, " ");

export function montarDxf(inp: PranchaIn): Buffer {
  const lat0 = inp.polygon.reduce((s, p) => s + p[0], 0) / inp.polygon.length;
  const lon0 = inp.polygon.reduce((s, p) => s + p[1], 0) / inp.polygon.length;
  const pj = projector(lat0, lon0);
  const z = utm(lat0, lon0);
  const U = (la: number, lo: number): XY => { const r = utm(la, lo); return [r.e, r.n]; };
  const raio = inp.raio, H = Math.max(2.5, raio / 110); // altura do texto, em metros

  let ent = "";
  const poli = (camada: string, pts: XY[], fechada: boolean) => {
    if (pts.length < 2) return;
    ent += g(0, "POLYLINE") + g(8, camada) + g(66, 1) + g(70, fechada ? 1 : 0);
    for (const [x, y] of pts) ent += g(0, "VERTEX") + g(8, camada) + g(10, num(x)) + g(20, num(y)) + g(30, "0.0");
    ent += g(0, "SEQEND") + g(8, camada);
  };
  const texto = (camada: string, x: number, y: number, s: string, h = H, rot = 0) => { ent += g(0, "TEXT") + g(8, camada) + g(10, num(x)) + g(20, num(y)) + g(30, "0.0") + g(40, num(h)) + g(1, txt(s)) + (rot ? g(50, num(rot)) : ""); };

  // lote e medidas
  const loteM = inp.polygon.map(([la, lo]) => pj.toM(la, lo));
  const est = polygonStats(loteM);
  const loteU = inp.polygon.map(([la, lo]) => U(la, lo));
  poli("LOTE", loteU, true);
  loteU.forEach((p, i) => {
    const q = loteU[(i + 1) % loteU.length], d = est.sides[i];
    texto("COTAS_LOTE", (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, `${d.toFixed(2).replace(".", ",")} m`, H * 0.8, (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI);
  });

  // vias, quadras
  const vias = inp.base.filter((e) => e.tags?.highway && VIA_CAMADA[e.tags.highway] && e.geometry && e.nodes);
  const geoU = (geom: { lat: number; lon: number }[]) => geom.map((q) => U(q.lat, q.lon));
  for (const v of vias) poli(VIA_CAMADA[v.tags!.highway], geoU(v.geometry!), false);
  const ways: Way[] = vias.map((w) => ({ highway: w.tags!.highway, nodes: w.nodes!, pts: w.geometry!.map((q) => pj.toM(q.lat, q.lon)) }));
  const faces = quadrasDeVias(ways);
  const faceLote = faces.filter((f) => pointInPolygon(est.centroid, f.poly)).sort((a, b) => Math.abs(a.area) - Math.abs(b.area))[0];
  for (const f of faces) {
    const pts = f.poly.map(([x, y]) => { const [la, lo] = pj.toGeo(x, y); return U(la, lo); });
    poli(f === faceLote ? "QUADRA_LOTE" : "QUADRAS", pts, true);
  }

  // edificações, verde, água
  for (const e of inp.base) {
    if (!e.geometry) continue;
    const t = e.tags || {};
    if (t.building) poli("EDIFICACOES", geoU(e.geometry), true);
    else if (t.leisure || t.landuse) poli("VERDE", geoU(e.geometry), true);
    else if (t.natural === "water") poli("AGUA", geoU(e.geometry), true);
    else if (t.waterway) poli("AGUA", geoU(e.geometry), false);
  }

  // nomes das ruas: no maior trecho reto de cada rua, rotacionado
  const usados = new Set<string>();
  const nomes = vias.filter((v) => v.tags!.name).map((v) => {
    const pts = geoU(v.geometry!);
    let melhor: { len: number; a: XY; b: XY } | null = null;
    for (let i = 1; i < pts.length; i++) { const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (!melhor || len > melhor.len) melhor = { len, a: pts[i - 1], b: pts[i] }; }
    return { nome: v.tags!.name, m: melhor };
  }).filter((n) => n.m).sort((a, b) => b.m!.len - a.m!.len);
  for (const n of nomes) {
    if (usados.has(n.nome) || usados.size >= 80) continue;
    const { a, b, len } = n.m!, comp = n.nome.length * H * 0.6;
    if (len < comp * 0.8) continue;
    let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    let [dx, dy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    if (ang > 90 || ang < -90) { ang += ang > 90 ? -180 : 180; dx = -dx; dy = -dy; }
    const mx = (a[0] + b[0]) / 2 - (dx * comp) / 2 + (dy * H) / 2, my = (a[1] + b[1]) / 2 - (dy * comp) / 2 - (dx * H) / 2;
    texto("NOMES_VIAS", mx, my, n.nome, H * 0.9, ang);
    usados.add(n.nome);
  }

  // lugares de referência
  const centro: LatLon = [lat0, lon0];
  for (const p of escolherLugares(inp.pois, centro, raio)) {
    const [x, y] = U(p.lat, p.lon);
    ent += g(0, "CIRCLE") + g(8, "LUGARES") + g(10, num(x)) + g(20, num(y)) + g(30, "0.0") + g(40, num(H * 0.5));
    texto("LUGARES", x + H * 0.8, y, `${GRUPOS[p.grupo].rotulo} - ${p.nome || GRUPOS[p.grupo].nome}`, H * 0.8);
  }

  // título e norte, fora da área do mapa
  const e = inp.endereco, xs = loteU.map((p) => p[0]), ys = loteU.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const x0 = cx - raio, y0 = cy + raio + H * 12;
  const linhas = [
    `MAPA DE SITUACAO${e.logradouro ? ` - ${e.logradouro}` : ""}${e.quadra ? `, Qd. ${e.quadra}` : ""}`,
    ...(inp.marca?.nome ? [inp.marca.nome] : []),
    ...(inp.marca?.nivel === "completa" && (inp.marca.responsavel || inp.marca.registro) ? [`Responsavel tecnico: ${[inp.marca.responsavel, inp.marca.registro].filter(Boolean).join(" - ")}`] : []),
    [e.bairro, [e.cidade, e.uf].filter(Boolean).join("/")].filter(Boolean).join(" - "),
    `Lote: ${Math.round(est.area).toLocaleString("pt-BR")} m2 (aprox.) - perimetro ${Math.round(est.perimeter)} m`,
    `Coordenadas UTM SIRGAS 2000, zona ${z.zona}${z.sul ? "S" : "N"}, em metros`,
    "Fonte: OpenStreetMap (ODbL). Desenho esquematico, sem valor cadastral ou legal.",
  ];
  linhas.forEach((l, i) => texto("TITULO", x0, y0 - i * H * 2, l, i === 0 ? H * 1.6 : H));
  const nx = cx + raio, ny = cy + raio;
  poli("NORTE", [[nx, ny], [nx, ny + H * 8]], false);
  poli("NORTE", [[nx - H, ny + H * 5], [nx, ny + H * 8], [nx + H, ny + H * 5]], false);
  texto("NORTE", nx - H * 0.5, ny + H * 9, "N", H * 1.5);

  const cab = g(0, "SECTION") + g(2, "HEADER") + g(9, "$ACADVER") + g(1, "AC1009") + g(9, "$DWGCODEPAGE") + g(3, "ANSI_1252") + g(0, "ENDSEC");
  const tabelas = g(0, "SECTION") + g(2, "TABLES")
    + g(0, "TABLE") + g(2, "LTYPE") + g(70, 1) + g(0, "LTYPE") + g(2, "CONTINUOUS") + g(70, 0) + g(3, "Solid line") + g(72, 65) + g(73, 0) + g(40, "0.0") + g(0, "ENDTAB")
    + g(0, "TABLE") + g(2, "LAYER") + g(70, CAMADAS.length) + CAMADAS.map(([n, c]) => g(0, "LAYER") + g(2, n) + g(70, 0) + g(62, c) + g(6, "CONTINUOUS")).join("") + g(0, "ENDTAB")
    + g(0, "ENDSEC");
  const corpo = g(0, "SECTION") + g(2, "ENTITIES") + ent + g(0, "ENDSEC") + g(0, "EOF");
  return Buffer.from(cab + tabelas + corpo, "latin1");
}
