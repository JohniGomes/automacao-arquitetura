import sharp from "sharp";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

/** Imagem de exemplo (placeholder) usada no modo mock — deixa claro que NÃO é saída real de IA. */
export async function mockImage(label: string, w = 1280, h = 720, seed = label): Promise<Buffer> {
  const h1 = hue(seed), h2 = (h1 + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${h1},35%,35%)"/><stop offset="1" stop-color="hsl(${h2},40%,60%)"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="${w * 0.18}" y="${h * 0.4}" width="${w * 0.64}" height="${h * 0.35}" fill="rgba(255,255,255,.25)"/>
  <rect x="${w * 0.1}" y="${h * 0.3}" width="${w * 0.45}" height="${h * 0.12}" fill="rgba(0,0,0,.25)"/>
  <text x="50%" y="${h * 0.14}" font-family="sans-serif" font-size="${Math.round(w / 24)}" fill="#fff" text-anchor="middle">MODO MOCK — imagem de exemplo</text>
  <text x="50%" y="${h * 0.92}" font-family="sans-serif" font-size="${Math.round(w / 34)}" fill="#fff" text-anchor="middle">${esc(label.slice(0, 70))}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Falso "satélite" para o modo sem chave do Google Maps. */
export async function mockSatellite(address: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1280">
  <rect width="100%" height="100%" fill="#4f6b3a"/>
  <rect x="0" y="560" width="1280" height="90" fill="#6d6d6d"/><rect x="590" y="0" width="80" height="1280" fill="#7a7a7a"/>
  <g fill="#b9a58a"><rect x="160" y="140" width="170" height="130"/><rect x="380" y="170" width="120" height="110"/><rect x="760" y="120" width="200" height="150"/>
  <rect x="180" y="760" width="190" height="160"/><rect x="760" y="780" width="160" height="200"/><rect x="1000" y="720" width="150" height="120"/></g>
  <circle cx="1020" cy="300" r="90" fill="#2f5a2a"/><circle cx="420" cy="1050" r="110" fill="#2f5a2a"/>
  <text x="50%" y="60" font-family="sans-serif" font-size="34" fill="#fff" text-anchor="middle">MOCK — satélite fictício</text>
  <text x="50%" y="1240" font-family="sans-serif" font-size="30" fill="#fff" text-anchor="middle">${esc(address.slice(0, 60))}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const TINTS: [number, number, number][] = [[214, 90, 120], [60, 140, 200], [240, 170, 50], [90, 170, 110], [150, 100, 200]];

/** Edição de exemplo (modo mock): pinta a região da máscara sobre a imagem para mostrar onde a IA mexeria. */
export async function mockEdit(base: Buffer, mask: Buffer, index: number): Promise<Buffer> {
  const meta = await sharp(base).metadata();
  const w = meta.width!, h = meta.height!;
  const [r, g, b] = TINTS[index % TINTS.length];
  const alpha = await sharp(mask).resize(w, h, { fit: "fill" }).greyscale().linear(0.55, 0).raw().toBuffer();
  const tint = await sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
  return sharp(base).composite([{ input: tint }]).png().toBuffer();
}
