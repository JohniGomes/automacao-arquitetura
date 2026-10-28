// Gera modelos de moodboard PLACEHOLDER em templates/moodboards. Substitua por imagens reais de referência.
import sharp from "sharp";
import fs from "node:fs";

fs.mkdirSync("templates/moodboards", { recursive: true });
const palettes = [["#c9b79c", "#8a6f4d", "#5b6b4a", "#2f3a33"], ["#e8d9c5", "#b98b73", "#7c8a8f", "#3b3f45"], ["#d8c3a5", "#a3b18a", "#588157", "#344e41"]];
for (const [i, p] of palettes.entries()) {
  const items = [[120, 110, 300, 260, -6], [330, 190, 330, 300, 5], [90, 480, 280, 300, 3], [380, 560, 300, 260, -4], [200, 860, 400, 220, 2]]
    .map(([x, y, w, h, r], k) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${p[k % 4]}" opacity=".85" transform="rotate(${r} ${x + w / 2} ${y + h / 2})"/>`).join("");
  const pills = p.map((c, k) => `<rect x="${110 + k * 150}" y="1090" width="130" height="64" rx="32" fill="${c}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="100%" height="100%" fill="#fff"/>${items}${pills}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(`templates/moodboards/modelo-exemplo-${i + 1}.jpg`);
}
console.log("Modelos placeholder criados.");
