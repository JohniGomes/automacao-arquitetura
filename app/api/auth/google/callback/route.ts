import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";
import { startSession } from "@/lib/auth";
import { store } from "@/lib/store";
import { LEGAL_VERSION } from "@/lib/legal";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const back = (path: string) => {
    const r = NextResponse.redirect(`${env.appUrl}${path}`);
    r.cookies.delete({ name: "gstate", path: "/api/auth/google" });
    return r;
  };
  const fail = (motivo = "desconhecido", detalhe = "") => {
    // o motivo (sem dados pessoais) vai para o log do servidor, para dar para diagnosticar no Render
    console.error(`google login falhou: ${motivo}${detalhe ? " — " + detalhe : ""}`);
    return back("/login?erro=google");
  };
  // o state da volta precisa ser o mesmo que saiu deste navegador
  const [nonce, aceiteFlag] = (req.cookies.get("gstate")?.value || "").split(":");
  const state = req.nextUrl.searchParams.get("state") || "";
  if (!nonce || nonce.length !== state.length || !crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(state))) return fail("state/cookie não bate (cookie gstate ausente ou expirado)");
  if (!code) return fail("sem code na volta", req.nextUrl.searchParams.get("error") || "");
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return fail("GOOGLE_CLIENT_ID/SECRET ausentes no servidor");
  try {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.appUrl}/api/auth/google/callback`, grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    }).then((r) => r.json());
    if (!tok.access_token) return fail("troca do code por token recusada", `${tok.error || ""} ${tok.error_description || ""} (redirect_uri usada: ${env.appUrl}/api/auth/google/callback)`);
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
      signal: AbortSignal.timeout(15_000),
    }).then((r) => r.json());
    if (!info.email || info.email_verified !== true || !info.sub) return fail("Google não devolveu e-mail verificado");
    const email = String(info.email).toLowerCase();
    let u = await store.getUserByEmail(email);
    if (!u) {
      // conta nova só nasce com o aceite dos Termos e da Política de Privacidade
      if (aceiteFlag !== "1") return back("/cadastro?erro=aceite");
      u = await store.createUser({ email, name: info.name || email, googleId: info.sub, termsAcceptedAt: new Date().toISOString(), termsVersion: LEGAL_VERSION, emailVerifiedAt: new Date().toISOString() });
    } else if (u.googleId) {
      if (u.googleId !== info.sub) return fail("conta já vinculada a outro Google");
    } else {
      // conta criada com senha e sem verificação de e-mail: não vincula ao Google, senão quem cadastrou o e-mail primeiro
      // (sem ser o dono) continuaria com acesso à conta depois que o dono entrasse pelo Google
      return back("/login?erro=conta-existente");
    }
    await startSession(u.id);
    return back("/app");
  } catch (e) {
    console.error("google callback:", (e as Error)?.message);
    return fail("exceção", (e as Error)?.message);
  }
}
