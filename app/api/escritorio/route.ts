import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { uid } from "@/lib/db";
import { limited } from "@/lib/ratelimit";
import { rulesOf } from "@/lib/plans";
import { store } from "@/lib/store";

export const runtime = "nodejs";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Marca do escritório: leitura e gravação (logo, nome e, no plano Max, responsável técnico, registro e cor). */
export async function GET() {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const o = await store.getOffice(u.id).catch(() => null);
  return NextResponse.json({ nivel: rulesOf(u).marcaEscritorio, escritorio: o });
}

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const nivel = rulesOf(u).marcaEscritorio;
  if (nivel === "nenhuma") return bad("A marca do escritório faz parte dos planos Profissional e Max.", 403);
  if (await limited(`escritorio:${u.id}`, 20, 10 * 60_000)) return bad("Muitas alterações em pouco tempo. Aguarde um pouco.", 429);
  const form = await req.formData();
  const str = (k: string, max: number) => String(form.get(k) || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
  const antes = await store.getOffice(u.id).catch(() => null);

  let logo = antes?.logo ?? null;
  if (form.get("removerLogo") === "1") logo = null;
  const f = form.get("logo");
  if (f instanceof File && f.size > 0) {
    if (f.size > 2 * 1024 * 1024) return bad("O logo tem mais de 2 MB.");
    try {
      // PNG com fundo transparente, no máximo 600 × 200 px: leve, igual em qualquer tela e seguro para embutir na prancha
      const png = await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize(600, 200, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
      logo = `logo-${uid().slice(0, 8)}.png`;
      await store.putFile(u.id, logo, png);
    } catch { return bad("Arquivo de logo inválido. Envie PNG, JPG ou WebP."); }
  }

  const completa = nivel === "completa";
  const cor = completa ? str("cor", 7) : "";
  if (cor && !/^#[0-9a-f]{6}$/i.test(cor)) return bad("Cor inválida. Use o formato #RRGGBB.");
  try {
    await store.saveOffice({
      userId: u.id, nome: str("nome", 80), logo,
      responsavel: completa ? str("responsavel", 80) : "", registro: completa ? str("registro", 40) : "", cor,
    });
  } catch (e: any) {
    console.error("saveOffice:", e?.message);
    return bad("Não foi possível salvar agora. Tente de novo em instantes.", 500);
  }
  return NextResponse.json({ ok: true });
}
