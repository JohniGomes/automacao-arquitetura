import { NextResponse } from "next/server";
import { env } from "@/lib/config";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.redirect(`${env.appUrl}/login?erro=google-nao-configurado`);
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
}
