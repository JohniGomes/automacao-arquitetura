/** Geometria do mapa de situação: projeção local em metros, medidas do lote e quadras (faces do grafo viário). */
export type LatLon = [number, number];
export type XY = [number, number];

/** Projeção equirretangular local (metros a leste/norte de um ponto). Boa para áreas de poucos km. */
export function projector(lat0: number, lon0: number) {
  const ky = 110574, kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    toM: (lat: number, lon: number): XY => [(lon - lon0) * kx, (lat - lat0) * ky],
    toGeo: (x: number, y: number): LatLon => [lat0 + y / ky, lon0 + x / kx],
  };
}

export function polygonArea(p: XY[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}

export function polygonStats(p: XY[]) {
  const sides = p.map((q, i) => { const r = p[(i + 1) % p.length]; return Math.hypot(r[0] - q[0], r[1] - q[1]); });
  const a = polygonArea(p);
  let cx = 0, cy = 0;
  if (Math.abs(a) > 1e-6) {
    for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; const f = x1 * y2 - x2 * y1; cx += (x1 + x2) * f; cy += (y1 + y2) * f; }
    cx /= 6 * a; cy /= 6 * a;
  } else { cx = p.reduce((s, q) => s + q[0], 0) / p.length; cy = p.reduce((s, q) => s + q[1], 0) / p.length; }
  return { area: Math.abs(a), perimeter: sides.reduce((s, v) => s + v, 0), sides, centroid: [cx, cy] as XY };
}

export function pointInPolygon(pt: XY, poly: XY[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** O polígono se cruza? (lote com lados cruzados não tem área confiável) */
export function selfIntersects(p: XY[]): boolean {
  const n = p.length;
  const ccw = (a: XY, b: XY, c: XY) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  const cross = (a: XY, b: XY, c: XY, d: XY) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
    if (cross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true;
  }
  return false;
}

export type Way = { highway: string; nodes: number[]; pts: XY[] };

/**
 * Quadras = faces fechadas do grafo viário (ruas e avenidas). Poda becos sem saída, percorre as arestas pela esquerda
 * e descarta a face externa e as gigantes (ruas cortadas pela borda da busca).
 */
export function quadrasDeVias(ways: Way[]): { poly: XY[]; area: number }[] {
  const xy = new Map<number, XY>(), adj = new Map<number, Set<number>>();
  for (const w of ways) {
    w.nodes.forEach((id, i) => xy.set(id, w.pts[i]));
    for (let i = 1; i < w.nodes.length; i++) {
      const a = w.nodes[i - 1], b = w.nodes[i];
      if (a === b) continue;
      (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
      (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
    }
  }
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const [n, s] of adj) if (s.size <= 1) { for (const v of s) adj.get(v)?.delete(n); adj.delete(n); mudou = true; }
  }
  const ordem = new Map<number, number[]>();
  for (const [n, s] of adj) {
    const [x0, y0] = xy.get(n)!;
    ordem.set(n, [...s].sort((a, b) => Math.atan2(xy.get(a)![1] - y0, xy.get(a)![0] - x0) - Math.atan2(xy.get(b)![1] - y0, xy.get(b)![0] - x0)));
  }
  const visto = new Set<string>(), faces: { poly: XY[]; area: number }[] = [];
  for (const [u, viz] of ordem) for (const v0 of viz) {
    if (visto.has(`${u}>${v0}`)) continue;
    let a = u, b = v0, guard = 0;
    const ids: number[] = [];
    while (!visto.has(`${a}>${b}`) && guard++ < 3000) {
      visto.add(`${a}>${b}`); ids.push(a);
      const lista = ordem.get(b)!;
      const i = lista.indexOf(a);
      const prox = lista[(i - 1 + lista.length) % lista.length];
      a = b; b = prox;
    }
    if (ids.length >= 3) { const poly = ids.map((i) => xy.get(i)!); faces.push({ poly, area: polygonArea(poly) }); }
  }
  const pos = faces.filter((f) => f.area > 0).length;
  const sinal = pos >= faces.length / 2 ? 1 : -1;
  return faces.filter((f) => f.area * sinal > 0 && Math.abs(f.area) > 400 && Math.abs(f.area) < 1.5e6);
}
