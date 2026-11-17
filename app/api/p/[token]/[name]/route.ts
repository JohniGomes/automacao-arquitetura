import { NextResponse } from "next/server";
import sharp from "sharp";
import { dadosDoLink } from "@/lib/share";
import { clientIp, limited } from "@/lib/ratelimit";
import { contentType, store } from "@/lib/store";

/**
 * Arquivo de um link público de apresentação. Sem login: só abre o que o link mostra (imagens e vídeos prontos do projeto e o logo
 * do escritório), enquanto o link estiver ativo. Nada de download com marca d'água: só os planos que têm link também têm download limpo.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; name: string }> }) {
  const { token, name } = await params;
  if (await limited(`pub:${clientIp(req)}`, 900, 10 * 60_000)) return new NextResponse("Muitos acessos. Aguarde um pouco.", { status: 429 });
  const share = await store.getShare(token).catch(() => null);
  if (!share) return new NextResponse("Link indisponível", { status: 404 });
  const dados = await dadosDoLink(share);
  if (!dados || !dados.arquivos.has(name)) return new NextResponse("Não encontrado", { status: 404 });

  const w = Math.min(1600, Math.max(0, Number(new URL(req.url).searchParams.get("w")) || 0));
  const headers = { "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  if (w && /\.(png|jpe?g|webp)$/i.test(name)) {
    const buf = await store.getFile(share.userId, name);
    if (!buf) return new NextResponse("Não encontrado", { status: 404 });
    const thumb = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer().catch(() => null);
    if (thumb) return new NextResponse(new Uint8Array(thumb), { headers: { ...headers, "Content-Type": "image/webp" } });
  }
  // Supabase: URL assinada do Storage (com Range para vídeo); modo local: o próprio arquivo
  const url = await store.fileUrl(share.userId, name, false);
  if (url) return NextResponse.redirect(url, { headers });
  const buf = await store.getFile(share.userId, name);
  if (!buf) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { ...headers, "Content-Type": contentType(name) } });
}
