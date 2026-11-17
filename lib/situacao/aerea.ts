import sharp from "sharp";
import { satellite } from "../maps";
import { LatLon, projector } from "./geo";
import { escolherLugares, GRUPOS, Grupo, Poi } from "./dados";

/**
 * Vista aérea ilustrativa: 1) o código monta o satélite visto de cima com o terreno tracejado e os pins numerados nas posições exatas,
 * cada um com o tipo e o nome do lugar; 2) o Gemini só muda a perspectiva e o acabamento; 3) o código acrescenta a legenda com os
 * nomes (texto exato, sem depender da IA) e a faixa de crédito do Google.
 */
const FONT = "Segoe UI, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
const mpp = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z) / 2; // metros por pixel em 1280 px (scale=2)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const titulo = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const fmtDist = (d: number) => (d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1).replace(".", ",")} km`);

export type PinAereo = { n: number; rotulo: string; grupo: Grupo; nome: string; d: number };
export type EntradaAerea = { marcada: Buffer; pins: PinAereo[]; zoom: number };

/** Maior zoom (mais detalhe) em que o lote cabe com folga e entram os lugares de referência. */
function escolherZoom(poly: LatLon[], centro: LatLon, pois: Poi[]): number {
  const pj = projector(centro[0], centro[1]);
  const vs = poly.map(([la, lo]) => pj.toM(la, lo));
  const raioLote = Math.max(...vs.map(([x, y]) => Math.hypot(x, y)));
  for (const z of [18, 17, 16, 15]) {
    const meia = 640 * mpp(centro[0], z) * 0.9;
    const cabe = raioLote <= meia * 0.7;
    const dentro = pois.filter((p) => { const [x, y] = pj.toM(p.lat, p.lon); return Math.abs(x) < meia && Math.abs(y) < meia; }).length;
    // prefere mostrar o máximo de lugares: aceita o zoom menor enquanto o lote ainda aparece bem
    if (cabe && dentro >= Math.min(8, pois.length)) return z;
  }
  return 15;
}

export async function montarEntradaAerea(poly: LatLon[], pois: Poi[], maxPins = 9): Promise<EntradaAerea> {
  const lat0 = poly.reduce((s, p) => s + p[0], 0) / poly.length, lon0 = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const centro: LatLon = [lat0, lon0];
  const pj = projector(lat0, lon0);
  // os lugares mais próximos, no máximo 2 de cada tipo
  const escolhidos = escolherLugares(pois, centro, 800, maxPins, 2);
  const zoom = escolherZoom(poly, centro, escolhidos);
  const m = mpp(lat0, zoom);
  const toPx = (lat: number, lon: number): [number, number] => { const [x, y] = pj.toM(lat, lon); return [640 + x / m, 640 - y / m]; };

  const sat = await satellite(`${lat0},${lon0}`, zoom);
  const pts = poly.map(([la, lo]) => toPx(la, lo));
  const dentro = escolhidos.filter((p) => { const [x, y] = toPx(p.lat, p.lon); return x > 130 && x < 1150 && y > 150 && y < 1170; });
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1280" font-family="${FONT}">
<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-width="5" stroke-dasharray="14 9" stroke-linejoin="round"/>`;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  svg += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="30" font-weight="800" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" text-anchor="middle">TERRENO</text>`;

  const pins: PinAereo[] = [];
  const caixas: { x1: number; x2: number; y1: number; y2: number }[] = [];
  const H = 58; // altura do rótulo (duas linhas: tipo e nome)
  dentro.forEach((p, i) => {
    const [x, y] = toPx(p.lat, p.lon), cor = GRUPOS[p.grupo].cor, rotulo = GRUPOS[p.grupo].rotulo;
    const nome = corta(p.nome || GRUPOS[p.grupo].nome, 26), n = i + 1;
    const w = Math.max(rotulo.length * 14, nome.length * 9.4) + 30;
    // rótulos que se sobreporiam sobem uns degraus (o pino continua no lugar certo)
    let sobe = 0;
    for (let k = 0; k < 4; k++) {
      const c = { x1: x - w / 2, x2: x + w / 2, y1: y - 72 - sobe - H, y2: y - 72 - sobe };
      if (!caixas.some((b) => c.x1 < b.x2 + 6 && c.x2 > b.x1 - 6 && c.y1 < b.y2 + 6 && c.y2 > b.y1 - 6)) { caixas.push(c); break; }
      sobe += H + 6;
    }
    svg += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${sobe ? `<line x1="0" y1="-62" x2="0" y2="${-72 - sobe}" stroke="${cor}" stroke-width="3"/>` : ""}<path d="M0,0 C-26,-30 -22,-62 0,-62 C22,-62 26,-30 0,0Z" fill="${cor}" stroke="#fff" stroke-width="3"/><text y="-34" font-size="22" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>
<g transform="translate(0,${-72 - sobe})"><rect x="${-w / 2}" y="${-H}" width="${w}" height="${H}" rx="9" fill="#fff" stroke="${cor}" stroke-width="2.5"/><text y="${-H + 24}" font-size="20" font-weight="800" fill="${cor}" text-anchor="middle">${esc(rotulo)}</text><text y="${-H + 46}" font-size="17" font-weight="600" fill="#1f1d1a" text-anchor="middle">${esc(nome)}</text></g></g>`;
    const [mx, my] = pj.toM(p.lat, p.lon);
    pins.push({ n, rotulo, grupo: p.grupo, nome: p.nome || GRUPOS[p.grupo].nome, d: Math.hypot(mx, my) });
  });
  svg += "</svg>";
  // corta a faixa de baixo (logotipo e atribuição do Google): a atribuição volta por código no resultado final
  const cheia = await sharp(sat).resize(1280, 1280).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  const marcada = await sharp(cheia).extract({ left: 0, top: 0, width: 1280, height: 1230 }).jpeg({ quality: 92 }).toBuffer();
  return { marcada, pins, zoom };
}

/** Faixa de crédito no pé da imagem final (as imagens de satélite são do Google e parceiros; a cena é ilustrativa). */
export async function comAtribuicao(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  const w = meta.width || 1024, h = meta.height || 1024, fs = Math.max(11, Math.round(w / 78)), bar = Math.round(fs * 2.4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${bar}" font-family="${FONT}"><rect width="100%" height="100%" fill="#000" fill-opacity="0.55"/>
<text x="${Math.round(fs * 0.8)}" y="${Math.round(bar * 0.64)}" font-size="${fs}" fill="#fff">Imagem ilustrativa criada por IA a partir de imagens de satélite © Google, Airbus, CNES / Maxar Technologies. Posições aproximadas.</text></svg>`;
  return sharp(img).composite([{ input: Buffer.from(svg), left: 0, top: h - bar }]).jpeg({ quality: 92 }).toBuffer();
}

/** Legenda embaixo da imagem, com o texto exato de cada lugar (a IA pode errar letras nos rótulos da cena). */
export async function comLegenda(img: Buffer, pins: PinAereo[]): Promise<Buffer> {
  if (!pins.length) return img;
  const meta = await sharp(img).metadata();
  const w = meta.width || 1024, h = meta.height || 1024;
  const fs = Math.max(14, Math.round(w / 62)), linha = Math.round(fs * 1.95), rows = Math.ceil(pins.length / 2), pad = Math.round(fs * 1.1);
  const legH = rows * linha + pad * 2 + Math.round(fs * 1.6);
  const colW = (w - pad * 3) / 2, maxCh = Math.max(16, Math.floor((colW - fs * 2.1 - fs * 4.8) / (fs * 0.52)));
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${legH}" font-family="${FONT}"><rect width="100%" height="100%" fill="#fbfaf6"/>
<text x="${pad}" y="${pad + fs * 0.6}" font-size="${Math.round(fs * 0.8)}" letter-spacing="2" font-weight="700" fill="#d6402f">NO ENTORNO DO TERRENO</text>`;
  pins.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = pad + col * (colW + pad), y = pad + fs * 1.6 + row * linha + fs;
    const txt = corta(`${titulo(GRUPOS[p.grupo].rotulo)} · ${p.nome}`, maxCh);
    svg += `<circle cx="${x + fs * 0.8}" cy="${y - fs * 0.35}" r="${fs * 0.8}" fill="${GRUPOS[p.grupo].cor}"/><text x="${x + fs * 0.8}" y="${y}" font-size="${fs}" font-weight="700" fill="#fff" text-anchor="middle">${p.n}</text>
<text x="${x + fs * 2.1}" y="${y}" font-size="${fs}" fill="#1f1d1a">${esc(txt)}</text><text x="${x + colW}" y="${y}" font-size="${fs}" fill="#6b655a" text-anchor="end">${fmtDist(p.d)}</text>`;
  });
  svg += "</svg>";
  return sharp({ create: { width: w, height: h + legH, channels: 3, background: "#fbfaf6" } })
    .composite([{ input: img, left: 0, top: 0 }, { input: Buffer.from(svg), left: 0, top: h }]).jpeg({ quality: 92 }).toBuffer();
}

export const PROMPT_AEREA = (pins: PinAereo[]) => `This image is a top-down satellite view of a neighbourhood in Brazil. A large empty plot of land is outlined by a white dashed line and labelled TERRENO. Numbered coloured map pins, each with a white two-line label box (category in bold coloured capitals, place name below), mark nearby places${pins.length ? `:\n${pins.map((p) => `${p.n}. ${p.rotulo} — ${p.nome}`).join("\n")}` : ""}.

TASK: transform it into a realistic OBLIQUE AERIAL PHOTO, as if taken by a drone about 150 metres above the ground, camera tilted roughly 35 to 45 degrees, looking toward the outlined plot, with a visible horizon and a clear afternoon sky in the background and natural daylight.

STRICT RULES:
- The outlined plot (white dashed line, text TERRENO) must stay the same plot, large and clearly visible in the middle or foreground, keeping its outline and the word TERRENO.
- Every pin must stay attached to the same building or place as in the source image, in relative position to the plot and to the roads, keeping exactly the same colours, the same numbers and exactly the same label texts (both lines), large and legible, in white boxes. Do not add, remove, rename, renumber or move pins, and do not translate or correct the place names.
- Keep the road network, highway, roundabouts, blocks and relative positions of everything faithful to the source. Do not invent new streets, big buildings, logos, brand names or other text.
- Photorealistic, natural colours, roofs, trees and surrounding houses as seen in the source.`;
