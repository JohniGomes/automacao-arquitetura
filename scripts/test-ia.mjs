// Teste das APIs reais de IA. Lê as chaves de .env.local (nunca as imprime) e salva os resultados em data/teste-ia/.
//
//   npm run test:ia -- --grok            imagem no Grok (1 chamada)
//   npm run test:ia -- --gemini          imagem no Gemini (1 chamada)
//   npm run test:ia -- --maps            satélite do Google Maps (1 chamada)
//   npm run test:ia -- --grok --video    inclui vídeo no Grok (a chamada mais cara: clipe de GROK_VIDEO_SECONDS)
//
// Usa public/casa/modelo.jpg (print de modelo 3D) e public/casa/render.jpg como imagens de entrada.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "data", "teste-ia");
fs.mkdirSync(out, { recursive: true });

// .env.local simples (KEY=valor)
const env = { ...process.env };
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !(m[1] in env && env[m[1]])) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const args = new Set(process.argv.slice(2));
const run = (k) => args.has(k) || args.size === 0 || (args.size === 1 && args.has("--video"));
const dataUri = (f) => `data:image/jpeg;base64,${fs.readFileSync(path.join(root, "public", "casa", f)).toString("base64")}`;
const PROMPT = "Transform the supplied architectural model screenshot into a photorealistic architectural visualization. Preserve the original building geometry, rooflines, window positions, proportions, camera angle and composition. Use exposed architectural concrete, natural wood, realistic glass reflections, tropical Brazilian landscaping and soft late-afternoon sunlight. Physically plausible materials, realistic global illumination, natural shadows, professional architectural photography, high detail, no structural modifications.";
const ok = (m) => console.log(`  OK   ${m}`);
const bad = (m) => console.log(`  ERRO ${m}`);
const hdr = (t) => console.log(`\n== ${t}`);
const secs = (t0) => ((Date.now() - t0) / 1000).toFixed(1) + " s";

async function post(url, headers, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* não-JSON */ }
  return { status: r.status, json, text };
}
const shape = (v, d = 0) => (v && typeof v === "object" && d < 3 ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Array.isArray(x) ? `[${x.length}]` + (x[0] && typeof x[0] === "object" ? JSON.stringify(shape(x[0], d + 1)) : "") : typeof x === "object" ? shape(x, d + 1) : typeof x === "string" && x.length > 60 ? `<texto ${x.length}>` : x])) : v);

async function geminiImage() {
  hdr("Gemini — imagem (render a partir do print)");
  if (!env.GEMINI_API_KEY) return bad("GEMINI_API_KEY não definida em .env.local");
  const model = env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
  const t0 = Date.now();
  const r = await post("https://generativelanguage.googleapis.com/v1beta/interactions", { "x-goog-api-key": env.GEMINI_API_KEY }, {
    model, input: [{ type: "text", text: PROMPT }, { type: "image", mime_type: "image/jpeg", data: dataUri("modelo.jpg").split(",")[1] }],
    response_format: { type: "image", mime_type: "image/jpeg", image_size: env.GEMINI_IMAGE_SIZE || "1K" },
  });
  console.log(`  modelo ${model} · HTTP ${r.status} · ${secs(t0)}`);
  if (r.status !== 200) return bad(r.text.slice(0, 500));
  const find = (n) => (!n || typeof n !== "object" ? null : n.type === "image" && n.data ? n : Object.values(n).map(find).find(Boolean) || null);
  const m = find(r.json);
  console.log("  formato da resposta:", JSON.stringify(shape(r.json)));
  if (!m) return bad("resposta sem imagem (o parser do app não acharia a imagem)");
  fs.writeFileSync(path.join(out, "gemini-render.jpg"), Buffer.from(m.data, "base64"));
  ok(`imagem salva em data/teste-ia/gemini-render.jpg (${Math.round(m.data.length * 0.75 / 1024)} KB)`);
}

async function grokImage() {
  hdr("Grok — imagem (render a partir do print)");
  if (!env.XAI_API_KEY) return bad("XAI_API_KEY não definida em .env.local");
  const model = env.GROK_IMAGE_MODEL || "grok-imagine-image-2.0";
  const base = { model, prompt: PROMPT, image: { url: dataUri("modelo.jpg"), type: "image_url" } };
  const tries = [
    { label: "com resolution e response_format", body: { ...base, response_format: "b64_json", resolution: "1k" } },
    { label: "só response_format", body: { ...base, response_format: "b64_json" } },
    { label: "mínimo (sem opcionais)", body: base },
  ];
  for (const t of tries) {
    const t0 = Date.now();
    const r = await post("https://api.x.ai/v1/images/edits", { Authorization: `Bearer ${env.XAI_API_KEY}` }, t.body);
    console.log(`  tentativa "${t.label}" · HTTP ${r.status} · ${secs(t0)}`);
    if (r.status >= 200 && r.status < 300) {
      console.log("  formato da resposta:", JSON.stringify(shape(r.json)));
      const d = r.json?.data?.[0];
      let buf = null;
      if (d?.b64_json) buf = Buffer.from(d.b64_json, "base64");
      else if (d?.url) buf = Buffer.from(await (await fetch(d.url)).arrayBuffer());
      if (!buf) return bad("resposta sem imagem utilizável");
      fs.writeFileSync(path.join(out, "grok-render.jpg"), buf);
      return ok(`imagem salva em data/teste-ia/grok-render.jpg (${Math.round(buf.length / 1024)} KB)`);
    }
    bad(r.text.slice(0, 400));
    if (r.status !== 400 && r.status !== 422) return;
  }
}

async function grokVideo() {
  hdr("Grok — vídeo (imagem para vídeo)");
  if (!env.XAI_API_KEY) return bad("XAI_API_KEY não definida em .env.local");
  const seconds = Number(env.GROK_VIDEO_SECONDS || 5), res = env.GROK_VIDEO_RES || "720p";
  console.log(`  pedindo ${seconds} s em ${res} (cobrança por segundo e por resolução)`);
  const t0 = Date.now();
  const r = await post("https://api.x.ai/v1/videos/generations", { Authorization: `Bearer ${env.XAI_API_KEY}` }, {
    model: env.GROK_VIDEO_MODEL || "grok-imagine-video-1.5",
    prompt: "Slow aerial push-in toward the house, late afternoon light. Preserve the building geometry, facade, window positions, materials and landscaping. Realistic reflections. Avoid structural deformation and flickering materials.",
    image: { url: dataUri("render.jpg") }, duration: seconds, resolution: res,
  });
  console.log(`  início · HTTP ${r.status}`);
  if (r.status < 200 || r.status >= 300) return bad(r.text.slice(0, 500) + "\n       (se a recusa for sobre a imagem, o xAI pode exigir URL pública: no app isso usa o link assinado do Supabase)");
  const id = r.json?.request_id;
  if (!id) return bad("sem request_id: " + r.text.slice(0, 300));
  for (let i = 0; i < 180; i++) {
    await new Promise((s) => setTimeout(s, 5000));
    const p = await (await fetch(`https://api.x.ai/v1/videos/${id}`, { headers: { Authorization: `Bearer ${env.XAI_API_KEY}` } })).json();
    process.stdout.write(`  estado: ${p.status} (${secs(t0)})\r`);
    if (p.status === "failed" || p.status === "expired") return bad(`\n  ${p.status}: ${JSON.stringify(p).slice(0, 300)}`);
    if (p.status === "done") {
      console.log("\n  formato da resposta:", JSON.stringify(shape(p)));
      const buf = Buffer.from(await (await fetch(p.video.url)).arrayBuffer());
      fs.writeFileSync(path.join(out, "grok-video.mp4"), buf);
      return ok(`vídeo salvo em data/teste-ia/grok-video.mp4 (${(buf.length / 1048576).toFixed(1)} MB) em ${secs(t0)}`);
    }
  }
  bad("tempo esgotado (15 min)");
}

async function maps() {
  hdr("Google Maps — satélite");
  if (!env.GOOGLE_MAPS_API_KEY) return bad("GOOGLE_MAPS_API_KEY não definida em .env.local");
  const p = new URLSearchParams({ center: "Av. Paulista, 1000, São Paulo", zoom: "18", size: "640x640", scale: "2", maptype: "satellite", key: env.GOOGLE_MAPS_API_KEY });
  const r = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${p}`);
  const type = r.headers.get("content-type") || "";
  console.log(`  HTTP ${r.status} · ${type}`);
  if (!r.ok || !type.startsWith("image/")) return bad((await r.text()).slice(0, 300));
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(path.join(out, "maps-satelite.png"), buf);
  ok(`satélite salvo em data/teste-ia/maps-satelite.png (${Math.round(buf.length / 1024)} KB)`);
}

console.log("Teste das APIs reais (as chaves não são exibidas).");
if (run("--gemini")) await geminiImage();
if (run("--grok")) await grokImage();
if (args.has("--video")) await grokVideo();
if (run("--maps")) await maps();
console.log("\nResultados em data/teste-ia/. Confira as imagens e a geometria da casa antes de seguir.");
