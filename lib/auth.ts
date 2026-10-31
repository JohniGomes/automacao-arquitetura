import crypto from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { User } from "./db";
import { env } from "./config";
import { store } from "./store";
import { releaseDueCredits } from "./billing";

const scrypt = promisify(crypto.scrypt) as (p: string, salt: string, len: number) => Promise<Buffer>;
const sign = (v: string) => crypto.createHmac("sha256", env.sessionSecret).update(v).digest("hex");
const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// scrypt assíncrono: o síncrono travava o servidor inteiro (inclusive a fila de gerações) durante cada login
export async function hashPassword(p: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(p, salt, 64)).toString("hex")}`;
}
const DUMMY = `${"0".repeat(32)}:${"0".repeat(128)}`;
/** Confere a senha. Sem hash (conta inexistente ou só Google) ele ainda faz a conta, para o tempo não revelar se o e-mail existe. */
export async function checkPassword(p: string, stored?: string) {
  const [salt, hash] = (stored || DUMMY).split(":");
  if (!salt || !hash) return false;
  const given = await scrypt(p, salt, 64);
  const want = Buffer.from(hash, "hex");
  return !!stored && want.length === given.length && crypto.timingSafeEqual(given, want);
}

export async function startSession(userId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const v = `${userId}.${exp}`;
  (await cookies()).set("sid", `${v}.${sign(v)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}
export async function endSession() { (await cookies()).delete("sid"); }

export async function currentUser(): Promise<User | null> {
  const c = (await cookies()).get("sid")?.value;
  if (!c) return null;
  const [id, exp, sig] = c.split(".");
  if (!id || !exp || !sig || !safeEq(sign(`${id}.${exp}`), sig) || Number(exp) < Date.now()) return null;
  const u = await store.getUser(id);
  // plano anual: libera os créditos dos meses que já chegaram
  return u ? releaseDueCredits(u) : null;
}
