import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { contentType, store } from "@/lib/store";

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const u = await currentUser();
  if (!u) return new NextResponse("Não autenticado", { status: 401 });
  const { name } = await params;
  const dl = !!new URL(req.url).searchParams.get("dl");
  // Supabase: redireciona para uma URL assinada (1 h) — vídeo e imagens saem direto do Storage, com suporte a Range.
  const url = await store.fileUrl(u.id, name, dl);
  if (url) return NextResponse.redirect(url, { headers: { "Cache-Control": "private, max-age=600" } });
  const buf = await store.getFile(u.id, name);
  if (!buf) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType(name),
      "Cache-Control": "private, max-age=3600",
      ...(dl ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
