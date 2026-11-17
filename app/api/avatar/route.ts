import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { limited } from "@/lib/ratelimit";
import { store } from "@/lib/store";

export const runtime = "nodejs";
const NOME = "avatar.png";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Foto de perfil do próprio usuário (PNG 256×256). Um arquivo bem pequeno no lugar da foto significa "sem foto". */
export async function GET() {
  const u = await currentUser();
  if (!u) return new NextResponse("Não autenticado", { status: 401 });
  const buf = await store.getFile(u.id, NOME).catch(() => null);
  if (!buf || buf.length < 100) return new NextResponse("Sem foto", { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" } });
}

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  if (await limited(`avatar:${u.id}`, 20, 10 * 60_000)) return bad("Muitas alterações em pouco tempo. Aguarde um pouco.", 429);
  const form = await req.formData().catch(() => null);
  const f = form?.get("foto");
  if (!(f instanceof File) || f.size === 0) return bad("Escolha uma imagem.");
  if (f.size > 3 * 1024 * 1024) return bad("A foto tem mais de 3 MB.");
  try {
    // recorte quadrado centralizado, leve e igual em qualquer tela
    const png = await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize(256, 256, { fit: "cover" }).png().toBuffer();
    await store.putFile(u.id, NOME, png);
  } catch { return bad("Arquivo inválido. Envie PNG, JPG ou WebP."); }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  await store.putFile(u.id, NOME, Buffer.from("-")).catch(() => {});
  return NextResponse.json({ ok: true });
}
