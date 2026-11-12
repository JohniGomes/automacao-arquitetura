import crypto from "node:crypto";
import { env } from "./config";

/**
 * Tokens assinados (HMAC) para os links de e-mail. Não ficam no banco: o link carrega o usuário, a finalidade e a
 * validade, e a assinatura cobre também um "bind" (no reset de senha, um pedaço do hash da senha atual: ao trocar a
 * senha o link usado deixa de valer).
 */
type Purpose = "verify" | "reset";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (v: string) => crypto.createHmac("sha256", env.sessionSecret).update(v).digest("base64url");

export function makeToken(purpose: Purpose, userId: string, ttlMs: number, bind = ""): string {
  const body = b64(JSON.stringify({ p: purpose, u: userId, e: Date.now() + ttlMs }));
  return `${body}.${sign(`${body}.${bind}`)}`;
}

/** Lê o token sem validar a assinatura (só para descobrir o usuário e buscar o "bind" certo). */
export function peekToken(token: string): { purpose: Purpose; userId: string } | null {
  try {
    const [body] = token.split(".");
    const j = JSON.parse(Buffer.from(body, "base64url").toString());
    return j?.p && j?.u ? { purpose: j.p, userId: String(j.u) } : null;
  } catch { return null; }
}

export function checkToken(token: string, purpose: Purpose, bind = ""): string | null {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const want = sign(`${body}.${bind}`);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const j = JSON.parse(Buffer.from(body, "base64url").toString());
    return j.p === purpose && Number(j.e) > Date.now() ? String(j.u) : null;
  } catch { return null; }
}
