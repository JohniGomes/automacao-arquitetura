import { NextRequest, NextResponse } from "next/server";
import { currentUser, hashPassword } from "@/lib/auth";
import { env } from "@/lib/config";
import { store } from "@/lib/store";
import { getLang } from "@/lib/i18n-server";
import { clientIp, limited } from "@/lib/ratelimit";
import { mailEnabled, sendResetMail, sendVerifyMail } from "@/lib/mail";
import { checkToken, makeToken, peekToken } from "@/lib/tokens";

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const TOO_MANY = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
const bindOf = (passHash?: string) => (passHash || "").slice(-16);

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const ip = clientIp(req);
  const b = await req.json().catch(() => ({}));
  const lang = await getLang();

  // reenvia o link de confirmação para quem está logado
  if (action === "send") {
    const u = await currentUser();
    if (!u) return bad("Não autenticado.", 401);
    if (u.emailVerifiedAt) return NextResponse.json({ ok: true });
    if (await limited(`vsend:${u.id}`, 3, 10 * 60_000)) return bad(TOO_MANY, 429);
    if (!mailEnabled()) return bad("O envio de e-mail não está ativo.", 501);
    try {
      await sendVerifyMail(u.email, makeToken("verify", u.id, 48 * 3600_000, u.email), lang);
    } catch (e: any) {
      console.error("verify mail:", e?.message);
      return bad("Não foi possível enviar o e-mail agora. Tente de novo em instantes.", 502);
    }
    return NextResponse.json({ ok: true });
  }

  // pede o link de redefinição; a resposta é sempre a mesma para não revelar quais e-mails existem
  if (action === "forgot") {
    const email = String(b.email || "").trim().toLowerCase().slice(0, 254);
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad("E-mail inválido.");
    if (await limited(`forgot-ip:${ip}`, 10, 10 * 60_000) || await limited(`forgot-mail:${email}`, 3, 10 * 60_000)) return bad(TOO_MANY, 429);
    if (!mailEnabled()) return bad("A recuperação por e-mail ainda não está ativa. Fale com o suporte.", 501);
    const u = await store.getUserByEmail(email);
    if (u?.passHash) {
      try { await sendResetMail(u.email, makeToken("reset", u.id, 3600_000, bindOf(u.passHash)), lang); } catch (e: any) { console.error("reset mail:", e?.message); }
    }
    return NextResponse.json({ ok: true });
  }

  // define a nova senha com o link recebido (o link deixa de valer assim que a senha muda)
  if (action === "reset") {
    if (await limited(`reset-ip:${ip}`, 10, 10 * 60_000)) return bad(TOO_MANY, 429);
    const token = String(b.token || ""), password = String(b.password || "").slice(0, 200);
    if (password.length < 8) return bad("A senha precisa ter ao menos 8 caracteres.");
    const peek = peekToken(token);
    const u = peek?.purpose === "reset" ? await store.getUser(peek.userId) : null;
    if (!u || !u.passHash || checkToken(token, "reset", bindOf(u.passHash)) !== u.id) return bad("Este link é inválido ou expirou. Peça um novo.");
    await store.setPassHash(u.id, await hashPassword(password));
    // quem recebeu o link no e-mail provou ser o dono dele
    if ((await store.markEmailVerified(u.id)) && env.signupCredits > 0) await store.grant(u.id, env.signupCredits, "Créditos de boas-vindas");
    return NextResponse.json({ ok: true });
  }
  return bad("Ação inválida.", 404);
}
