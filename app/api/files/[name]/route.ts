import { NextResponse } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { contentType, store } from "@/lib/store";
import { rulesOf } from "@/lib/plans";

/** Marca d'água discreta no canto inferior direito. Mantém o formato da imagem (JPEG ou PNG). */
async function watermark(buf: Buffer): Promise<Buffer> {
  const img = sharp(buf);
  const m = await img.metadata();
  const w = m.width || 1280, h = m.height || 720;
  const fs = Math.max(18, Math.round(w * 0.024));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${w - fs}" y="${h - fs}" text-anchor="end" font-family="Arial, sans-serif" font-size="${fs}" font-weight="700" fill="#ffffff" fill-opacity="0.75" stroke="#000000" stroke-opacity="0.35" stroke-width="${Math.max(1, fs / 14)}">ArqIA</text></svg>`;
  const out = img.composite([{ input: Buffer.from(svg) }]);
  return m.format === "png" ? out.png().toBuffer() : out.jpeg({ quality: 92 }).toBuffer();
}

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const u = await currentUser();
  if (!u) return new NextResponse("Não autenticado", { status: 401 });
  const { name } = await params;
  const q = new URL(req.url).searchParams;
  const dl = !!q.get("dl");
  const w = Math.min(1600, Math.max(0, Number(q.get("w")) || 0));
  const isImage = /\.(png|jpe?g|webp)$/i.test(name);

  // miniatura: a lista de gerações não precisa baixar os originais em tamanho cheio
  if (w && isImage && !dl) {
    const buf = await store.getFile(u.id, name);
    if (!buf) return new NextResponse("Não encontrado", { status: 404 });
    const thumb = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer().catch(() => null);
    if (thumb) return new NextResponse(new Uint8Array(thumb), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } });
  }

  // download de imagem sem plano Profissional/Max leva a marca d'água do ArqIA
  if (dl && isImage && !rulesOf(u).semMarca) {
    const orig = await store.getFile(u.id, name);
    if (!orig) return new NextResponse("Não encontrado", { status: 404 });
    const marked = await watermark(orig).catch(() => null);
    if (marked) return new NextResponse(new Uint8Array(marked), { headers: { "Content-Type": contentType(name), "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${name.replace(/[^A-Za-z0-9._-]/g, "_")}"` } });
  }

  // Supabase: redireciona para uma URL assinada (1 h) — vídeo e imagens saem direto do Storage, com suporte a Range.
  const url = await store.fileUrl(u.id, name, dl);
  if (url) return NextResponse.redirect(url, { headers: { "Cache-Control": "private, max-age=600" } });
  const buf = await store.getFile(u.id, name);
  if (!buf) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType(name),
      "Cache-Control": "private, max-age=3600",
      ...(dl ? { "Content-Disposition": `attachment; filename="${name.replace(/[^A-Za-z0-9._-]/g, "_")}"` } : {}),
    },
  });
}
