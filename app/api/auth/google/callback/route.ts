import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";
import { startSession } from "@/lib/auth";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const fail = () => NextResponse.redirect(`${env.appUrl}/login?erro=google`);
  if (!code || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return fail();
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.appUrl}/api/auth/google/callback`, grant_type: "authorization_code",
    }),
  }).then((r) => r.json());
  if (!tok.access_token) return fail();
  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  }).then((r) => r.json());
  if (!info.email || info.email_verified === false) return fail();
  const email = String(info.email).toLowerCase();
  let u = await store.getUserByEmail(email);
  if (!u) u = await store.createUser({ email, name: info.name || email, googleId: info.sub });
  else if (!u.googleId) await store.setGoogleId(u.id, info.sub);
  await startSession(u.id);
  return NextResponse.redirect(`${env.appUrl}/app`);
}
