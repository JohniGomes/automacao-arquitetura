import { env } from "../config";
import { UserError } from "../errors";
import { LatLon } from "./geo";

/** Dados de entorno do mapa de situação: ruas/quadras/prédios (OpenStreetMap via Overpass) e lugares de referência. */

export type OsmEl = {
  type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number };
  tags?: Record<string, string>; nodes?: number[]; geometry?: { lat: number; lon: number }[];
};

const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const UA = "Croqui-mapa-de-situacao/1.0";
const g = globalThis as unknown as { __ovCache?: Map<string, { at: number; data: OsmEl[] }> };
const cache = (g.__ovCache ??= new Map());
const TTL = 24 * 3600_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Consulta o Overpass com tempo limite, dois servidores e repetição. Cache por região, para poupar o servidor público. */
async function overpass(query: string, key: string): Promise<OsmEl[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  let last = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(2000 * attempt);
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(80_000),
      });
      const text = await res.text();
      if (res.ok && text.trimStart().startsWith("{")) {
        const data = (JSON.parse(text).elements || []) as OsmEl[];
        cache.set(key, { at: Date.now(), data });
        if (cache.size > 40) cache.delete(cache.keys().next().value!);
        return data;
      }
      last = `Overpass ${res.status}`;
    } catch (e: any) { last = e?.message || String(e); }
  }
  console.error("overpass:", last);
  throw new UserError("Não conseguimos buscar os dados do mapa agora (servidor público de mapas ocupado). Tente de novo em alguns minutos; seus créditos foram devolvidos.");
}

const r3 = (n: number) => n.toFixed(3);

/** Ruas, edificações, áreas verdes e água ao redor do centro (raio em metros). */
export async function buscarBase(lat: number, lon: number, raio: number): Promise<OsmEl[]> {
  const a = `(around:${Math.round(raio)},${lat.toFixed(6)},${lon.toFixed(6)})`;
  const q = `[out:json][timeout:60];(
    way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|living_street)$"]${a};
    way["building"]${a};
    way["leisure"~"park|pitch|garden"]${a};
    way["landuse"~"grass|recreation_ground|forest"]${a};
    way["natural"="water"]${a};
    way["waterway"~"river|stream|canal"]${a};
  );out geom;`;
  return overpass(q, `base:${r3(lat)}:${r3(lon)}:${Math.round(raio / 100)}`);
}

// ------------------------------------------------------------------ lugares de referência
export type Grupo = "escola" | "saude" | "farmacia" | "mercado" | "igreja" | "parque" | "esporte" | "publico";
export type Poi = { grupo: Grupo; nome: string; lat: number; lon: number };

export const GRUPOS: Record<Grupo, { nome: string; cor: string; rotulo: string }> = {
  escola: { nome: "Escola / educação", cor: "#2f6fb5", rotulo: "ESCOLA" },
  saude: { nome: "Saúde", cor: "#d6402f", rotulo: "SAÚDE" },
  farmacia: { nome: "Farmácia", cor: "#e0507a", rotulo: "FARMÁCIA" },
  mercado: { nome: "Mercado / comércio", cor: "#e08a1e", rotulo: "MERCADO" },
  igreja: { nome: "Igreja", cor: "#6a5acd", rotulo: "IGREJA" },
  parque: { nome: "Praça / parque", cor: "#3f8f4a", rotulo: "PRAÇA" },
  esporte: { nome: "Academia / esporte", cor: "#0f8b8d", rotulo: "ACADEMIA" },
  publico: { nome: "Equipamento público", cor: "#5d6d7e", rotulo: "PÚBLICO" },
};

function grupoOsm(t: Record<string, string>): Grupo | null {
  const am = t.amenity, sh = t.shop, le = t.leisure;
  if (["school", "kindergarten", "college", "university"].includes(am)) return "escola";
  if (am === "pharmacy" || sh === "chemist") return "farmacia";
  if (["hospital", "clinic", "doctors", "dentist"].includes(am) || t.healthcare) return "saude";
  if (["supermarket", "convenience", "mall", "department_store"].includes(sh)) return "mercado";
  if (am === "place_of_worship") return "igreja";
  if (le === "park" || le === "garden" || le === "playground") return "parque";
  if (["fitness_centre", "sports_centre", "stadium"].includes(le)) return "esporte";
  if (["police", "fire_station", "townhall", "community_centre", "library", "post_office"].includes(am)) return "publico";
  return null;
}

async function poisOsm(lat: number, lon: number, raio: number): Promise<Poi[]> {
  const a = `(around:${Math.round(raio)},${lat.toFixed(6)},${lon.toFixed(6)})`;
  const q = `[out:json][timeout:60];(
    nwr["amenity"~"school|kindergarten|college|university|pharmacy|hospital|clinic|doctors|dentist|place_of_worship|police|fire_station|townhall|community_centre|library|post_office"]${a};
    nwr["shop"~"supermarket|convenience|mall|department_store|chemist"]${a};
    nwr["healthcare"]${a};
    nwr["leisure"~"park|garden|playground|fitness_centre|sports_centre|stadium"]${a};
  );out center tags;`;
  const els = await overpass(q, `poi:${r3(lat)}:${r3(lon)}:${Math.round(raio / 100)}`);
  const out: Poi[] = [];
  for (const e of els) {
    const t = e.tags || {}, grupo = grupoOsm(t);
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (!grupo || la == null || lo == null) continue;
    out.push({ grupo, nome: t.name || "", lat: la, lon: lo });
  }
  return out;
}

const GOOGLE_TIPOS: Record<Grupo, string[]> = {
  escola: ["school"], saude: ["hospital", "doctor"], farmacia: ["pharmacy"], mercado: ["supermarket", "grocery_store", "shopping_mall"],
  igreja: ["church"], parque: ["park"], esporte: ["gym"], publico: ["police", "city_hall", "post_office"],
};

/** Places API (New). Atenção: os termos do Google pedem que esses dados apareçam em mapa do Google; veja SITUACAO_POIS no README. */
async function poisGoogle(lat: number, lon: number, raio: number): Promise<Poi[]> {
  const out: Poi[] = [];
  await Promise.all((Object.keys(GOOGLE_TIPOS) as Grupo[]).map(async (grupo) => {
    try {
      const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST", signal: AbortSignal.timeout(15_000),
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.mapsKey, "X-Goog-FieldMask": "places.displayName,places.location" },
        body: JSON.stringify({ includedTypes: GOOGLE_TIPOS[grupo], maxResultCount: 5, rankPreference: "DISTANCE", languageCode: "pt-BR",
          locationRestriction: { circle: { center: { latitude: lat, longitude: lon }, radius: Math.min(50000, raio) } } }),
      });
      if (!r.ok) return;
      const j = await r.json();
      for (const p of j.places || []) out.push({ grupo, nome: p.displayName?.text || "", lat: p.location.latitude, lon: p.location.longitude });
    } catch { /* um grupo que falha não derruba o mapa */ }
  }));
  return out;
}

/** Fonte dos lugares: "osm" (padrão, dados abertos, cobertura irregular no Brasil) ou "google" (mais completa; ver termos). */
export const fonteLugares = () => (process.env.SITUACAO_POIS || "osm").toLowerCase() === "google" && env.mapsKey ? "google" : "osm";

export async function buscarLugares(lat: number, lon: number, raio: number): Promise<{ pois: Poi[]; fonte: "osm" | "google" }> {
  const fonte = fonteLugares();
  try {
    return { pois: fonte === "google" ? await poisGoogle(lat, lon, raio) : await poisOsm(lat, lon, raio), fonte };
  } catch (e) {
    console.error("lugares:", (e as Error)?.message);
    return { pois: [], fonte }; // sem lugares o mapa sai mesmo assim, com a lista vazia
  }
}

export const distM = (a: LatLon, lat: number, lon: number) => {
  const ky = 110574, kx = 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot((lon - a[1]) * kx, (lat - a[0]) * ky);
};

/** Escolhe até `max` lugares: os mais próximos, no máximo `porGrupo` por tipo, sem nome genérico repetido. */
export function escolherLugares(pois: Poi[], centro: LatLon, meia: number, max = 14, porGrupo = 2) {
  const items = pois
    .map((p) => ({ ...p, d: distM(centro, p.lat, p.lon) }))
    .filter((p) => p.d <= meia * 1.35)
    .sort((a, b) => a.d - b.d);
  const cont: Record<string, number> = {}, vistos = new Set<string>(), out: (typeof items) = [];
  for (const p of items) {
    const chave = `${p.grupo}:${p.nome.toLowerCase()}`;
    if (p.nome && vistos.has(chave)) continue;
    // sem nome só entra para saúde, farmácia e escola (o grupo vira o nome); o resto sem nome não ajuda o leitor
    if (!p.nome && !["saude", "farmacia", "escola"].includes(p.grupo)) continue;
    if (p.nome.trim().length > 0 && p.nome.trim().length < 3) continue;
    if ((cont[p.grupo] = (cont[p.grupo] || 0) + 1) > porGrupo) continue;
    vistos.add(chave);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
