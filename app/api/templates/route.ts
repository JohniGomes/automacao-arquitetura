import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const DIR = path.join(process.cwd(), "templates", "moodboards");

/** Lista a galeria de modelos de moodboard cadastrados pelo dono do app (arquivos em templates/moodboards). */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("img");
  if (name) {
    const p = path.join(DIR, path.basename(name));
    if (!fs.existsSync(p)) return new NextResponse("Não encontrado", { status: 404 });
    const e = p.split(".").pop()!.toLowerCase();
    return new NextResponse(new Uint8Array(fs.readFileSync(p)), {
      headers: { "Content-Type": e === "png" ? "image/png" : e === "webp" ? "image/webp" : "image/jpeg", "Cache-Control": "public, max-age=3600" },
    });
  }
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort() : [];
  return NextResponse.json({ templates: files.map((f) => ({ file: f, name: f.replace(/\.[^.]+$/, "").replace(/^\d+[-_]?/, "").replace(/[-_]/g, " ") })) });
}
