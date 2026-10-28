import fs from "node:fs";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";
import { DATA_DIR, db, Generation, save, Tx, uid, User } from "./db";

/** Camada de dados. Produção = Supabase (Postgres + Storage). Desenvolvimento sem Supabase = arquivos locais (data/). */
export interface Store {
  kind: "supabase" | "local";
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(d: { email: string; name: string; passHash?: string; googleId?: string }): Promise<User>;
  setGoogleId(id: string, googleId: string): Promise<void>;
  /** débito atômico: false se saldo insuficiente */
  charge(userId: string, amount: number, reason: string, genId?: string): Promise<boolean>;
  grant(userId: string, amount: number, reason: string, genId?: string): Promise<void>;
  saveGen(g: Generation): Promise<void>;
  getGen(id: string, userId: string): Promise<Generation | null>;
  listGens(userId: string): Promise<Generation[]>;
  listTxs(userId: string, limit: number): Promise<Tx[]>;
  staleGens(): Promise<Generation[]>;
  putFile(userId: string, name: string, data: Buffer): Promise<void>;
  getFile(userId: string, name: string): Promise<Buffer | null>;
  /** URL temporária para o navegador baixar/streamar direto do Storage; null no modo local */
  fileUrl(userId: string, name: string, download: boolean): Promise<string | null>;
}

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4" };
export const contentType = (name: string) => TYPES[name.split(".").pop() || ""] || "application/octet-stream";

// ---------------------------------------------------------------- local
const fdir = (userId: string) => path.join(DATA_DIR, "files", userId);
const localStore: Store = {
  kind: "local",
  async getUser(id) { return db().users.find((u) => u.id === id) ?? null; },
  async getUserByEmail(email) { return db().users.find((u) => u.email === email) ?? null; },
  async createUser(d) {
    const u: User = { id: uid(), ...d, credits: env.signupCredits, createdAt: new Date().toISOString() };
    db().users.push(u);
    db().txs.push({ id: uid(), userId: u.id, delta: u.credits, reason: "Créditos de boas-vindas", at: u.createdAt });
    save();
    return u;
  },
  async setGoogleId(id, googleId) { const u = db().users.find((x) => x.id === id); if (u) { u.googleId = googleId; save(); } },
  async charge(userId, amount, reason, genId) {
    const u = db().users.find((x) => x.id === userId);
    if (!u || u.credits < amount) return false;
    u.credits -= amount;
    db().txs.push({ id: uid(), userId, delta: -amount, reason, genId, at: new Date().toISOString() });
    save();
    return true;
  },
  async grant(userId, amount, reason, genId) {
    const u = db().users.find((x) => x.id === userId);
    if (!u) return;
    u.credits += amount;
    db().txs.push({ id: uid(), userId, delta: amount, reason, genId, at: new Date().toISOString() });
    save();
  },
  async saveGen(g) {
    const i = db().generations.findIndex((x) => x.id === g.id);
    if (i >= 0) db().generations[i] = g; else db().generations.push(g);
    save();
  },
  async getGen(id, userId) { return db().generations.find((x) => x.id === id && x.userId === userId) ?? null; },
  async listGens(userId) { return db().generations.filter((g) => g.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async listTxs(userId, limit) { return db().txs.filter((t) => t.userId === userId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit); },
  async staleGens() { return db().generations.filter((g) => g.status === "queued" || g.status === "running"); },
  async putFile(userId, name, data) { fs.mkdirSync(fdir(userId), { recursive: true }); fs.writeFileSync(path.join(fdir(userId), path.basename(name)), data); },
  async getFile(userId, name) { const p = path.join(fdir(userId), path.basename(name)); return fs.existsSync(p) ? fs.readFileSync(p) : null; },
  async fileUrl() { return null; },
};

// ------------------------------------------------------------ supabase
const BUCKET = process.env.SUPABASE_BUCKET || "arqia";
const g = globalThis as unknown as { __sb?: SupabaseClient };
const sb = () => (g.__sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const check = (error: { message: string } | null, what: string) => { if (error) throw new Error(`Supabase (${what}): ${error.message}`); };

const toUser = (r: any): User => ({ id: r.id, email: r.email, name: r.name, passHash: r.pass_hash ?? undefined, googleId: r.google_id ?? undefined, credits: r.credits, createdAt: r.created_at });
const toGen = (r: any): Generation => ({
  id: r.id, userId: r.user_id, type: r.type, status: r.status, progress: r.progress, message: r.message ?? "", createdAt: r.created_at,
  finishedAt: r.finished_at ?? undefined, summary: r.summary, prompt: r.prompt ?? undefined, outputs: r.outputs ?? [], cost: r.cost,
  mock: r.mock, error: r.error ?? undefined, usage: r.usage ?? { images: 0, videoClips: 0 },
});

const supabaseStore: Store = {
  kind: "supabase",
  async getUser(id) {
    const { data, error } = await sb().from("users").select("*").eq("id", id).maybeSingle();
    check(error, "getUser");
    return data ? toUser(data) : null;
  },
  async getUserByEmail(email) {
    const { data, error } = await sb().from("users").select("*").eq("email", email).maybeSingle();
    check(error, "getUserByEmail");
    return data ? toUser(data) : null;
  },
  async createUser(d) {
    const row = { id: uid(), email: d.email, name: d.name, pass_hash: d.passHash ?? null, google_id: d.googleId ?? null, credits: env.signupCredits };
    const { data, error } = await sb().from("users").insert(row).select("*").single();
    check(error, "createUser");
    if (env.signupCredits > 0) {
      const t = await sb().from("credit_txs").insert({ user_id: row.id, delta: env.signupCredits, reason: "Créditos de boas-vindas" });
      check(t.error, "createUser/tx");
    }
    return toUser(data);
  },
  async setGoogleId(id, googleId) { check((await sb().from("users").update({ google_id: googleId }).eq("id", id)).error, "setGoogleId"); },
  async charge(userId, amount, reason, genId) {
    const { data, error } = await sb().rpc("charge_credits", { p_user: userId, p_amount: amount, p_reason: reason, p_gen: genId ?? null });
    check(error, "charge");
    return data === true;
  },
  async grant(userId, amount, reason, genId) {
    check((await sb().rpc("grant_credits", { p_user: userId, p_amount: amount, p_reason: reason, p_gen: genId ?? null })).error, "grant");
  },
  async saveGen(x) {
    const row = {
      id: x.id, user_id: x.userId, type: x.type, status: x.status, progress: x.progress, message: x.message, summary: x.summary,
      prompt: x.prompt ?? null, outputs: x.outputs, cost: x.cost, mock: x.mock, error: x.error ?? null, usage: x.usage,
      created_at: x.createdAt, finished_at: x.finishedAt ?? null,
    };
    check((await sb().from("generations").upsert(row)).error, "saveGen");
  },
  async getGen(id, userId) {
    const { data, error } = await sb().from("generations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    check(error, "getGen");
    return data ? toGen(data) : null;
  },
  async listGens(userId) {
    const { data, error } = await sb().from("generations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
    check(error, "listGens");
    return (data ?? []).map(toGen);
  },
  async listTxs(userId, limit) {
    const { data, error } = await sb().from("credit_txs").select("*").eq("user_id", userId).order("at", { ascending: false }).limit(limit);
    check(error, "listTxs");
    return (data ?? []).map((r: any) => ({ id: r.id, userId: r.user_id, delta: r.delta, reason: r.reason, genId: r.gen_id ?? undefined, at: r.at }));
  },
  async staleGens() {
    const { data, error } = await sb().from("generations").select("*").in("status", ["queued", "running"]);
    check(error, "staleGens");
    return (data ?? []).map(toGen);
  },
  async putFile(userId, name, data) {
    const { error } = await sb().storage.from(BUCKET).upload(`${userId}/${path.basename(name)}`, data, { contentType: contentType(name), upsert: true });
    check(error, "putFile");
  },
  async getFile(userId, name) {
    const { data, error } = await sb().storage.from(BUCKET).download(`${userId}/${path.basename(name)}`);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  },
  async fileUrl(userId, name, download) {
    const { data, error } = await sb().storage.from(BUCKET).createSignedUrl(`${userId}/${path.basename(name)}`, 3600, download ? { download: path.basename(name) } : undefined);
    return error || !data ? null : data.signedUrl;
  },
};

// Escolha lazy (o build do Next importa os módulos sem variáveis de ambiente).
function impl(): Store {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return supabaseStore;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORE !== "true") {
    throw new Error("Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (os dados não podem ficar no disco do servidor).");
  }
  return localStore;
}
export const store: Store = new Proxy({} as Store, { get: (_t, k) => (impl() as any)[k] });
