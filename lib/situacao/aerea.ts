import sharp from "sharp";
import { satellite } from "../maps";
import { LatLon, projector } from "./geo";
import { escolherLugares, GRUPOS, Grupo, Poi } from "./dados";

/**
 * Vista aérea ilustrativa: 1) o código monta o satélite visto de cima com o terreno tracejado e os pins nas posições exatas;
 * 2) o Gemini só muda a perspectiva e o acabamento. O desenho "de cima" garante que cada pin nasce no lugar certo.
 */
const FONT = "Segoe UI, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
const mpp = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z) / 2; // metros por pixel em 1280 px (scale=2)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export type EntradaAerea = { marcada: Buffer; pins: { rotulo: string; nome: string; grupo: Grupo }[]; zoom: number };

/** Maior zoom (mais detalhe) em que o lote cabe com folga e entram pelo menos alguns lugares de referência. */
function escolherZoom(poly: LatLon[], centro: LatLon, pois: Poi[]): number {
  const pj = projector(centro[0], centro[1]);
  const vs = poly.map(([la, lo]) => pj.toM(la, lo));
  const raioLote = Math.max(...vs.map(([x, y]) => Math.hypot(x, y)));
  for (const z of [18, 17, 16, 15]) {
    const meia = 640 * mpp(centro[0], z) * 0.9;
    const cabe = raioLote <= meia * 0.7;
    const dentro = pois.filter((p) => { const [x, y] = pj.toM(p.lat, p.lon); return Math.abs(x) < meia && Math.abs(y) < meia; }).length;
    if (cabe && dentro >= Math.min(4, pois.length)) return z;
  }
  return 15;
}

export async function montarEntradaAerea(poly: LatLon[], pois: Poi[]): Promise<EntradaAerea> {
  const lat0 = poly.reduce((s, p) => s + p[0], 0) / poly.length, lon0 = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const centro: LatLon = [lat0, lon0];
  const pj = projector(lat0, lon0);
  // um pin por tipo de lugar (os mais próximos): imagem limpa e fácil de ler
  const escolhidos = escolherLugares(pois, centro, 800, 6, 1).filter((p) => p.nome || p.grupo === "saude" || p.grupo === "farmacia" || p.grupo === "escola");
  const zoom = escolherZoom(poly, centro, escolhidos);
  const m = mpp(lat0, zoom);
  const toPx = (lat: number, lon: number): [number, number] => { const [x, y] = pj.toM(lat, lon); return [640 + x / m, 640 - y / m]; };

  const sat = await satellite(`${lat0},${lon0}`, zoom);
  const pts = poly.map(([la, lo]) => toPx(la, lo));
  const dentro = escolhidos.filter((p) => { const [x, y] = toPx(p.lat, p.lon); return x > 110 && x < 1170 && y > 110 && y < 1170; });
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1280" font-family="${FONT}">
<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-width="5" stroke-dasharray="14 9" stroke-linejoin="round"/>`;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  svg += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="30" font-weight="800" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" text-anchor="middle">TERRENO</text>`;
  const pins: EntradaAerea["pins"] = [];
  const caixas: { x1: number; x2: number; y1: number; y2: number }[] = [];
  for (const p of dentro) {
    const [x, y] = toPx(p.lat, p.lon), cor = GRUPOS[p.grupo].cor, rotulo = GRUPOS[p.grupo].rotulo;
    const w = rotulo.length * 17 + 26;
    // rótulos que se sobreporiam sobem uns degraus (o pino continua no lugar certo)
    let sobe = 0;
    for (let k = 0; k < 4; k++) {
      const c = { x1: x - w / 2, x2: x + w / 2, y1: y - 100 - sobe, y2: y - 66 - sobe };
      if (!caixas.some((b) => c.x1 < b.x2 + 6 && c.x2 > b.x1 - 6 && c.y1 < b.y2 + 6 && c.y2 > b.y1 - 6)) { caixas.push(c); break; }
      sobe += 42;
    }
    svg += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${sobe ? `<line x1="0" y1="-62" x2="0" y2="${-66 - sobe}" stroke="${cor}" stroke-width="3"/>` : ""}<path d="M0,0 C-26,-30 -22,-62 0,-62 C22,-62 26,-30 0,0Z" fill="${cor}" stroke="#fff" stroke-width="3"/><circle cy="-42" r="8" fill="#fff"/>
<g transform="translate(0,${-74 - sobe})"><rect x="${-w / 2}" y="-26" width="${w}" height="34" rx="8" fill="#fff" stroke="${cor}" stroke-width="2.5"/><text y="-2" font-size="22" font-weight="800" fill="${cor}" text-anchor="middle">${esc(rotulo)}</text></g></g>`;
    pins.push({ rotulo, nome: p.nome, grupo: p.grupo });
  }
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

export const PROMPT_AEREA = (pins: EntradaAerea["pins"]) => `This image is a top-down satellite view of a neighbourhood in Brazil. A large empty plot of land is outlined by a white dashed line and labelled TERRENO. Coloured map pins with white label boxes mark nearby places${pins.length ? ` (${pins.map((p) => p.rotulo).join(", ")})` : ""}.

TASK: transform it into a realistic OBLIQUE AERIAL PHOTO, as if taken by a drone about 150 metres above the ground, camera tilted roughly 35 to 45 degrees, looking toward the outlined plot, with a visible horizon and a clear afternoon sky in the background and natural daylight.

STRICT RULES:
- The outlined plot (white dashed line, text TERRENO) must stay the same plot, large and clearly visible in the middle or foreground, keeping its outline and the word TERRENO.
- Every pin must stay attached to the same building or place as in the source image, in relative position to the plot and to the roads, keeping exactly the same colours and exactly the same label texts, large and legible, in white boxes. Do not add, remove, rename or move pins.
- Keep the road network, highway, roundabouts, blocks and relative positions of everything faithful to the source. Do not invent new streets, big buildings, logos, brand names or other text.
- Photorealistic, natural colours, roofs, trees and surrounding houses as seen in the source.`;
