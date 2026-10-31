import { NextRequest, NextResponse } from "next/server";
import { checkPassword, currentUser, endSession, hashPassword, startSession } from "@/lib/auth";
import { store } from "@/lib/store";
import { LEGAL_VERSION } from "@/lib/legal";
import { clientIp, limited } from "@/lib/ratelimit";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const TOO_MANY = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action === "logout") { await endSession(); return NextResponse.json({ ok: true }); }
  const ip = clientIp(req);
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase().slice(0, 254);
  const password = String(b.password || "").slice(0, 200);
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("E-mail inválido.");
  if (action === "register") {
    // cada conta nova ganha créditos: o limite por IP segura quem tenta criar contas em série
    if (limited(`reg:${ip}`, 5, 60 * 60_000)) return bad(TOO_MANY, 429);
    if (b.aceite !== true) return bad("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.");
    if (password.length < 8) return bad("A senha precisa ter ao menos 8 caracteres.");
    if (await store.getUserByEmail(email)) return bad("Este e-mail já está cadastrado.", 409);
    try {
      const u = await store.createUser({ email, name: String(b.name || email.split("@")[0]).trim().slice(0, 80), passHash: await hashPassword(password), termsAcceptedAt: new Date().toISOString(), termsVersion: LEGAL_VERSION });
      await startSession(u.id);
    } catch {
      return bad("Este e-mail já está cadastrado.", 409);
    }
    return NextResponse.json({ ok: true });
  }
  if (action === "login") {
    if (limited(`login-ip:${ip}`, 20, 10 * 60_000) || limited(`login-mail:${email}`, 8, 10 * 60_000)) return bad(TOO_MANY, 429);
    const u = await store.getUserByEmail(email);
    if (!(await checkPassword(password, u?.passHash)) || !u) return bad("E-mail ou senha incorretos.", 401);
    await startSession(u.id);
    return NextResponse.json({ ok: true });
  }
  return bad("Ação inválida.", 404);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "me") return bad("Não encontrado.", 404);
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  return NextResponse.json({ id: u.id, email: u.email, name: u.name, credits: u.credits });
}
