import fs from "node:fs";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";
import { DATA_DIR, db, Generation, Payment, PlanFields, Project, save, SupportMsg, Tx, uid, User } from "./db";

/** Camada de dados. Produção = Supabase (Postgres + Storage). Desenvolvimento sem Supabase = arquivos locais (data/). */
export interface Store {
  kind: "supabase" | "local";
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(d: { email: string; name: string; passHash?: string; googleId?: string; termsAcceptedAt: string; termsVersion: string }): Promise<User>;
  setGoogleId(id: string, googleId: string): Promise<void>;
  /** grava campos do plano (undefined não altera; null limpa) */
  setPlan(userId: string, f: { [K in keyof PlanFields]?: PlanFields[K] | null }): Promise<void>;
  /** registra um pagamento; false se esse pagamento já tinha sido registrado (webhook repetido) */
  recordPayment(p: Payment): Promise<boolean>;
  /** pagamento já registrado (para estornos e dedupe) */
  findPayment(provider: string, refId: string): Promise<Payment | null>;
  /** usuário pela assinatura no Asaas */
  getUserBySubscription(subId: string): Promise<User | null>;
  /** débito atômico: false se saldo insuficiente */
  charge(userId: string, amount: number, reason: string, genId?: string): Promise<boolean>;
  grant(userId: string, amount: number, reason: string, genId?: string): Promise<void>;
  saveGen(g: Generation): Promise<void>;
  getGen(id: string, userId: string): Promise<Generation | null>;
  listGens(userId: string): Promise<Generation[]>;
  listTxs(userId: string, limit: number): Promise<Tx[]>;
  staleGens(): Promise<Generation[]>;
  listProjects(userId: string): Promise<Project[]>;
  getProject(id: string, userId: string): Promise<Project | null>;
  createProject(userId: string, name: string): Promise<Project>;
  renameProject(id: string, userId: string, name: string): Promise<Project | null>;
  /** apaga o projeto; as gerações dele ficam sem projeto */
  deleteProject(id: string, userId: string): Promise<void>;
  /** favorito e/ou projeto de uma geração (projectId null = sem projeto) */
  setGenMeta(id: string, userId: string, meta: { favorite?: boolean; projectId?: string | null }): Promise<Generation | null>;
  /** mensagem para o suporte (lida pelo dono do app no banco) */
  addSupport(m: { userId: string; email: string; subject: string; message: string }): Promise<void>;
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
  async setPlan(userId, f) {
    const u = db().users.find((x) => x.id === userId);
    if (!u) return;
    for (const [k, v] of Object.entries(f)) { if (v === undefined) continue; if (v === null) delete (u as any)[k]; else (u as any)[k] = v; }
    save();
  },
  async recordPayment(p) {
    const all = (db().payments ??= []);
    if (all.some((x) => x.provider === p.provider && x.refId === p.refId)) return false;
    all.push(p);
    save();
    return true;
  },
  async findPayment(provider, refId) { return (db().payments ?? []).find((x) => x.provider === provider && x.refId === refId) ?? null; },
  async getUserBySubscription(subId) { return db().users.find((u) => u.asaasSubscriptionId === subId) ?? null; },
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
  async listProjects(userId) { return db().projects.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async getProject(id, userId) { return db().projects.find((p) => p.id === id && p.userId === userId) ?? null; },
  async createProject(userId, name) {
    const p: Project = { id: uid(), userId, name, createdAt: new Date().toISOString() };
    db().projects.push(p); save();
    return p;
  },
  async renameProject(id, userId, name) {
    const p = db().projects.find((x) => x.id === id && x.userId === userId);
    if (!p) return null;
    p.name = name; save();
    return p;
  },
  async deleteProject(id, userId) {
    db().projects = db().projects.filter((p) => !(p.id === id && p.userId === userId));
    for (const g of db().generations) if (g.userId === userId && g.projectId === id) g.projectId = null;
    save();
  },
  async setGenMeta(id, userId, meta) {
    const g = db().generations.find((x) => x.id === id && x.userId === userId);
    if (!g) return null;
    if (meta.favorite !== undefined) g.favorite = meta.favorite;
    if (meta.projectId !== undefined) g.projectId = meta.projectId;
    save();
    return g;
  },
  async addSupport(m) {
    const row: SupportMsg = { id: uid(), ...m, createdAt: new Date().toISOString() };
    (db().support ??= []).push(row);
    save();
  },
  async putFile(userId, name, data) { fs.mkdirSync(fdir(userId), { recursive: true }); fs.writeFileSync(path.join(fdir(userId), path.basename(name)), data); },
  async getFile(userId, name) { const p = path.join(fdir(userId), path.basename(name)); return fs.existsSync(p) ? fs.readFileSync(p) : null; },
  async fileUrl() { return null; },
};

// ------------------------------------------------------------ supabase
const BUCKET = process.env.SUPABASE_BUCKET || "arqia";
const g = globalThis as unknown as { __sb?: SupabaseClient };
const sb = () => (g.__sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const check = (error: { message: string } | null, what: string) => { if (error) throw new Error(`Supabase (${what}): ${error.message}`); };

const toUser = (r: any): User => ({ id: r.id, email: r.email, name: r.name, passHash: r.pass_hash ?? undefined, googleId: r.google_id ?? undefined, credits: r.credits, createdAt: r.created_at, termsAcceptedAt: r.terms_accepted_at ?? undefined, termsVersion: r.terms_version ?? undefined,
  plan: r.plan ?? undefined, planUntil: r.plan_until ?? undefined, planStatus: r.plan_status ?? undefined, asaasCustomerId: r.asaas_customer_id ?? undefined, asaasSubscriptionId: r.asaas_subscription_id ?? undefined });
const toGen = (r: any): Generation => ({
  id: r.id, userId: r.user_id, type: r.type, status: r.status, progress: r.progress, message: r.message ?? "", createdAt: r.created_at,
  finishedAt: r.finished_at ?? undefined, summary: r.summary, prompt: r.prompt ?? undefined, outputs: r.outputs ?? [], cost: r.cost,
  mock: r.mock, error: r.error ?? undefined, usage: r.usage ?? { images: 0, videoClips: 0 },
  projectId: r.project_id ?? null, favorite: r.favorite ?? false,
});
const toProject = (r: any): Project => ({ id: r.id, userId: r.user_id, name: r.name, createdAt: r.created_at });
/** erro de coluna/tabela inexistente: o SQL novo (supabase/schema.sql) ainda não foi executado */
const missingSchema = (e: { message: string } | null) => !!e && /project_id|favorite|projects|schema cache|does not exist/i.test(e.message);

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
    let { data, error } = await sb().from("users").insert({ ...row, terms_accepted_at: d.termsAcceptedAt, terms_version: d.termsVersion }).select("*").single();
    if (error && /terms_(accepted_at|version)/.test(error.message)) {
      // colunas do aceite ainda não criadas no Supabase (rodar supabase/schema.sql): cadastra sem elas para não derrubar o serviço
      console.warn("Colunas terms_accepted_at/terms_version ausentes no Supabase; aceite não gravado. Execute o ALTER do supabase/schema.sql.");
      ({ data, error } = await sb().from("users").insert(row).select("*").single());
    }
    check(error, "createUser");
    if (env.signupCredits > 0) {
      const t = await sb().from("credit_txs").insert({ user_id: row.id, delta: env.signupCredits, reason: "Créditos de boas-vindas" });
      check(t.error, "createUser/tx");
    }
    return toUser(data);
  },
  async setGoogleId(id, googleId) { check((await sb().from("users").update({ google_id: googleId }).eq("id", id)).error, "setGoogleId"); },
  async setPlan(userId, f) {
    const col: Record<string, string> = { plan: "plan", planUntil: "plan_until", planStatus: "plan_status", asaasCustomerId: "asaas_customer_id", asaasSubscriptionId: "asaas_subscription_id" };
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f)) if (v !== undefined) row[col[k]] = v;
    if (!Object.keys(row).length) return;
    const { error } = await sb().from("users").update(row).eq("id", userId);
    if (error && /plan|schema cache|does not exist/i.test(error.message)) throw new Error("Planos ainda não estão disponíveis: execute o SQL novo (supabase/migracao-planos.sql) no Supabase.");
    check(error, "setPlan");
  },
  async recordPayment(p) {
    const { error } = await sb().from("payments").insert({ provider: p.provider, ref_id: p.refId, user_id: p.userId, kind: p.kind, item: p.item, amount: p.amount });
    if (error && /duplicate key|23505/i.test(error.message)) return false;
    if (error && /payments|schema cache|does not exist/i.test(error.message)) throw new Error("Pagamentos ainda não estão disponíveis: execute o SQL novo (supabase/migracao-planos.sql) no Supabase.");
    check(error, "recordPayment");
    return true;
  },
  async findPayment(provider, refId) {
    const { data, error } = await sb().from("payments").select("*").eq("provider", provider).eq("ref_id", refId).maybeSingle();
    if (error && /payments|schema cache|does not exist/i.test(error.message)) return null;
    check(error, "findPayment");
    return data ? { provider: data.provider, refId: data.ref_id, userId: data.user_id, kind: data.kind, item: data.item, amount: Number(data.amount), createdAt: data.created_at } : null;
  },
  async getUserBySubscription(subId) {
    const { data, error } = await sb().from("users").select("*").eq("asaas_subscription_id", subId).maybeSingle();
    check(error, "getUserBySubscription");
    return data ? toUser(data) : null;
  },
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
    let { error } = await sb().from("generations").upsert({ ...row, project_id: x.projectId ?? null, favorite: x.favorite ?? false });
    if (error && missingSchema(error)) {
      console.warn("Colunas project_id/favorite ausentes no Supabase; execute o SQL novo de supabase/schema.sql.");
      ({ error } = await sb().from("generations").upsert(row));
    }
    check(error, "saveGen");
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
  async listProjects(userId) {
    const { data, error } = await sb().from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (missingSchema(error)) return [];
    check(error, "listProjects");
    return (data ?? []).map(toProject);
  },
  async getProject(id, userId) {
    const { data, error } = await sb().from("projects").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (missingSchema(error)) return null;
    check(error, "getProject");
    return data ? toProject(data) : null;
  },
  async createProject(userId, name) {
    const { data, error } = await sb().from("projects").insert({ id: uid(), user_id: userId, name }).select("*").single();
    if (missingSchema(error)) throw new Error("Projetos ainda não estão disponíveis: execute o SQL novo (supabase/schema.sql) no Supabase.");
    check(error, "createProject");
    return toProject(data);
  },
  async renameProject(id, userId, name) {
    const { data, error } = await sb().from("projects").update({ name }).eq("id", id).eq("user_id", userId).select("*").maybeSingle();
    check(error, "renameProject");
    return data ? toProject(data) : null;
  },
  async deleteProject(id, userId) {
    // as gerações ficam sem projeto (FK on delete set null; o update explícito cobre bancos sem a FK)
    await sb().from("generations").update({ project_id: null }).eq("project_id", id).eq("user_id", userId);
    check((await sb().from("projects").delete().eq("id", id).eq("user_id", userId)).error, "deleteProject");
  },
  async setGenMeta(id, userId, meta) {
    const patch: Record<string, unknown> = {};
    if (meta.favorite !== undefined) patch.favorite = meta.favorite;
    if (meta.projectId !== undefined) patch.project_id = meta.projectId;
    const { data, error } = await sb().from("generations").update(patch).eq("id", id).eq("user_id", userId).select("*").maybeSingle();
    if (missingSchema(error)) throw new Error("Favoritos e projetos ainda não estão disponíveis: execute o SQL novo (supabase/schema.sql) no Supabase.");
    check(error, "setGenMeta");
    return data ? toGen(data) : null;
  },
  async addSupport(m) {
    const { error } = await sb().from("support_messages").insert({ id: uid(), user_id: m.userId, email: m.email, subject: m.subject, message: m.message });
    if (error && /support_messages|schema cache|does not exist/i.test(error.message)) throw new Error("O suporte ainda não está disponível: execute o SQL novo (supabase/migracao-suporte.sql) no Supabase.");
    check(error, "addSupport");
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
