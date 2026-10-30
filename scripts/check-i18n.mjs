// Lista os textos em português usados no app que ainda não têm tradução em lib/en.ts.
// Uso: node scripts/check-i18n.mjs   (sai com código 1 se faltar algo; --all lista todos os textos encontrados)
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return ["node_modules", ".next", "data", "docs-privado", ".git"].includes(e.name) ? [] : walk(p);
  return /\.(tsx?|mjs)$/.test(e.name) ? [p] : [];
});
const files = ["app", "components", "lib", "scripts"].flatMap((d) => walk(path.join(root, d)));

const en = fs.readFileSync(path.join(root, "lib", "en.ts"), "utf8");
const have = new Set([...en.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => JSON.parse('"' + m[1] + '"')));

const found = new Map();
const add = (s, f) => { if (s && !found.has(s)) found.set(s, f); };
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const rx = (src, flags = "g") => new RegExp(src, flags);

for (const f of files) {
  const fp = f.replace(/\\/g, "/");
  if (/lib\/en\.ts$|check-i18n\.mjs$|lib\/i18n\.ts$|I18nProvider/.test(fp)) continue;
  const src = fs.readFileSync(f, "utf8");
  // t("texto") e t("texto", {...})
  for (const m of src.matchAll(rx("\\bt\\(\\s*" + STR))) add(unq(m[1]), f);
  // textos passados como props para componentes que os traduzem (ToolShell, Seg, Slider, ImageInput, Fold...)
  for (const m of src.matchAll(rx("\\b(?:title|tip|label|left|right|hint|valueLabel)=" + STR))) if (/[a-zà-ú]/i.test(m[1])) add(unq(m[1]), f);
  // objetos com textos de interface em componentes e páginas
  if (/\/(components|app)\//.test(fp)) for (const m of src.matchAll(rx("\\b(?:label|desc|q|a|title): " + STR))) add(unq(m[1]), f);
  // listas de opções e etapas
  for (const blk of src.matchAll(/(?:ESTILOS_ARQ|TIPOS_IDEIA|ETAPAS)\b[^=]*=\s*([\[{][\s\S]*?[\]}])(?: as const)?;/g)) for (const x of blk[1].matchAll(rx(STR))) add(unq(x[1]), f);
  // rótulos de dados exibidos pela interface
  if (/lib\/(compose|prompts|tools|costs)\.ts$/.test(fp)) {
    for (const m of src.matchAll(rx("\\b(?:label|desc|rotulo|nome|group): " + STR))) add(unq(m[1]), f);
    for (const m of src.matchAll(/itens: \[([^\]]*)\]/g)) for (const s of m[1].matchAll(rx(STR))) add(unq(s[1]), f);
    for (const m of src.matchAll(/TYPE_LABEL[^=]*=\s*\{([^}]*)\}/g)) for (const s of m[1].matchAll(rx(": " + STR))) add(unq(s[1]), f);
  }
}
const missing = [...found].filter(([k]) => !have.has(k));
if (process.argv.includes("--all")) console.log([...found.keys()].join("\n"));
else for (const [k, f] of missing) console.log(JSON.stringify(k), "←", path.relative(root, f).replace(/\\/g, "/"));
console.log(`\n${found.size} textos, ${missing.length} sem tradução.`);
process.exit(missing.length && !process.argv.includes("--all") ? 1 : 0);
