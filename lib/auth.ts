import crypto from "node:crypto";
import { cookies } from "next/headers";
import { User } from "./db";
import { env } from "./config";
import { store } from "./store";

const sign = (v: string) => crypto.createHmac("sha256", env.sessionSecret).update(v).digest("hex");

export function hashPassword(p: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(p, salt, 64).toString("hex")}`;
}
export function checkPassword(p: string, stored?: string) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  return crypto.timingSafeEqual(crypto.scryptSync(p, salt, 64), Buffer.from(hash, "hex"));
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
  if (!sig || sign(`${id}.${exp}`) !== sig || Number(exp) < Date.now()) return null;
  return store.getUser(id);
}
