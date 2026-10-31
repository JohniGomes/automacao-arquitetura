import { NextResponse } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { contentType, store } from "@/lib/store";

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
