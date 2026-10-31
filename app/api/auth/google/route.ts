import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/config";

/**
 * Início do login com Google. O `state` é um valor aleatório guardado também em cookie httpOnly: o callback só
 * aceita a volta se os dois baterem (protege contra login forçado). O aceite dos Termos também fica no cookie,
 * não na URL, que o usuário controla.
 */
export async function GET(req: Request) {
  const aceite = new URL(req.url).searchParams.get("aceite") === "1";
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.redirect(`${env.appUrl}/login?erro=google-nao-configurado`);
  const nonce = crypto.randomBytes(24).toString("hex");
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state: nonce,
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
  res.cookies.set("gstate", `${nonce}:${aceite ? 1 : 0}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  return res;
}
