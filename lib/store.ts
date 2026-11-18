import fs from "node:fs";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";
import { DATA_DIR, db, Escritorio, Generation, Payment, PlanFields, Project, PushSub, Coupon, save, Share, SupportMsg, Tx, uid, User } from "./db";

/** Camada de dados. Produção = Supabase (Postgres + Storage). Desenvolvimento sem Supabase = arquivos locais (data/). */
export interface Store {
  kind: "supabase" | "local";
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(d: { email: string; name: string; passHash?: string; googleId?: string; termsAcceptedAt: string; termsVersion: string; emailVerifiedAt?: string; signupCredits?: number }): Promise<User>;
  /** confirma o e-mail (e devolve false se já estava confirmado) */
  markEmailVerified(id: string): Promise<boolean>;
  setPassHash(id: string, passHash: string): Promise<void>;
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
  /** quantos lançamentos existem com esse motivo (limite de vagas do código do VDO Club) */
  countTxsByReason(reason: string): Promise<number>;
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
  /** últimas mensagens de suporte (painel de administração) */
  listSupport(limit: number): Promise<SupportMsg[]>;
  /** marca do escritório do usuário (null se ainda não preencheu ou se o SQL novo não foi executado) */
  getOffice(userId: string): Promise<Escritorio | null>;
  /** cupons (vazio se o SQL novo não foi executado) */
  listCoupons(): Promise<Coupon[]>;
  getCoupon(code: string): Promise<Coupon | null>;
  saveCoupon(c: Coupon): Promise<void>;
  /** painel de administração: tudo de todos os usuários */
  adminUsers(): Promise<User[]>;
  adminGens(sinceIso: string): Promise<Generation[]>;
  adminPayments(): Promise<Payment[]>;
  /** aparelhos inscritos para notificação push (vazio se o SQL novo não foi executado) */
  listPushes(userId: string): Promise<PushSub[]>;
  addPush(s: PushSub): Promise<void>;
  removePush(endpoint: string): Promise<void>;
  /** links de apresentação ativos do usuário (vazio se o SQL novo não foi executado) */
  listShares(userId: string): Promise<Share[]>;
  /** link ativo pelo token (null se não existe ou foi revogado) */
  getShare(token: string): Promise<Share | null>;
  createShare(userId: string, projectId: string, token: string): Promise<Share>;
  revokeShare(userId: string, token: string): Promise<void>;
  saveOffice(o: Escritorio): Promise<void>;
  putFile(userId: string, name: string, data: Buffer): Promise<void>;
  getFile(userId: string, name: string): Promise<Buffer | null>;
  /** URL temporária para o navegador baixar/streamar direto do Storage; null no modo local */
  fileUrl(userId: string, name: string, download: boolean): Promise<string | null>;
}

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", svg: "image/svg+xml", dxf: "application/dxf" };
export const contentType = (name: string) => TYPES[name.split(".").pop() || ""] || "application/octet-stream";

// ---------------------------------------------------------------- local
const fdir = (userId: string) => path.join(DATA_DIR, "files", userId);
const localStore: Store = {
  kind: "local",
  async getUser(id) { return db().users.find((u) => u.id === id) ?? null; },
  async getUserByEmail(email) { return db().users.find((u) => u.email === email) ?? null; },
  async createUser(d) {
    const { signupCredits, ...rest } = d;
    const u: User = { id: uid(), ...rest, credits: signupCredits ?? env.signupCredits, createdAt: new Date().toISOString() };
    db().users.push(u);
    if (u.credits > 0) db().txs.push({ id: uid(), userId: u.id, delta: u.credits, reason: "Créditos de boas-vindas", at: u.createdAt });
    save();
    return u;
  },
  async setGoogleId(id, googleId) { const u = db().users.find((x) => x.id === id); if (u) { u.googleId = googleId; save(); } },
  async markEmailVerified(id) { const u = db().users.find((x) => x.id === id); if (!u || u.emailVerifiedAt) return false; u.emailVerifiedAt = new Date().toISOString(); save(); return true; },
  async setPassHash(id, passHash) { const u = db().users.find((x) => x.id === id); if (u) { u.passHash = passHash; save(); } },
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
  async countTxsByReason(reason) { return db().txs.filter((t) => t.reason === reason).length; },
  async listTxs(userId, limit) { return db().txs.filter((t) => t.userId === userId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit); },
  async staleGens() { return db().generations.filter((g) => g.status === "queued" || g.status === "running"); },
  // cupons gravados antes dos descontos não têm tipo: são de acesso
  async listCoupons() { return db().coupons!.map((c) => ({ ...c, semCartao: c.semCartao ?? c.tipo === undefined, tipo: c.tipo ?? "acesso", desconto: c.desconto ?? 0 })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async getCoupon(code) { const c = db().coupons!.find((x) => x.code === code.toLowerCase()); return c ? { ...c, semCartao: c.semCartao ?? c.tipo === undefined, tipo: c.tipo ?? "acesso", desconto: c.desconto ?? 0 } : null; },
  async saveCoupon(c) { const l = db().coupons!.filter((x) => x.code !== c.code); l.push(c); db().coupons = l; save(); },
  async adminUsers() { return [...db().users]; },
  async adminGens(sinceIso) { return db().generations.filter((g) => g.createdAt >= sinceIso); },
  async adminPayments() { return [...(db().payments ?? [])]; },
  async listPushes(userId) { return db().pushes!.filter((p) => p.userId === userId); },
  async addPush(s) { const l = db().pushes!.filter((p) => p.endpoint !== s.endpoint); l.push(s); db().pushes = l; save(); },
  async removePush(endpoint) { db().pushes = db().pushes!.filter((p) => p.endpoint !== endpoint); save(); },
  async listShares(userId) { return db().shares!.filter((s) => s.userId === userId && !s.revokedAt); },
  async getShare(token) { return db().shares!.find((s) => s.token === token && !s.revokedAt) ?? null; },
  async createShare(userId, projectId, token) {
    const s: Share = { token, userId, projectId, createdAt: new Date().toISOString(), revokedAt: null };
    db().shares!.push(s); save();
    return s;
  },
  async revokeShare(userId, token) {
    const s = db().shares!.find((x) => x.token === token && x.userId === userId);
    if (s) { s.revokedAt = new Date().toISOString(); save(); }
  },
  async getOffice(userId) { return db().offices!.find((o) => o.userId === userId) ?? null; },
  async saveOffice(o) {
    const list = db().offices!, i = list.findIndex((x) => x.userId === o.userId);
    if (i >= 0) list[i] = o; else list.push(o);
    save();
  },
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
  async listSupport(limit) { return [...(db().support ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); },
  async putFile(userId, name, data) { fs.mkdirSync(fdir(userId), { recursive: true }); fs.writeFileSync(path.join(fdir(userId), path.basename(name)), data); },
  async getFile(userId, name) { const p = path.join(fdir(userId), path.basename(name)); return fs.existsSync(p) ? fs.readFileSync(p) : null; },
  async fileUrl() { return null; },
};

// ------------------------------------------------------------ supabase
const BUCKET = process.env.SUPABASE_BUCKET || "arqia";
const g = globalThis as unknown as { __sb?: SupabaseClient };
const sb = () => (g.__sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const check = (error: { message: string } | null, what: string) => { if (error) throw new Error(`Supabase (${what}): ${error.message}`); };

const toUser = (r: any): User => ({ id: r.id, email: r.email, name: r.name, passHash: r.pass_hash ?? undefined, googleId: r.google_id ?? undefined, credits: r.credits, createdAt: r.created_at, termsAcceptedAt: r.terms_accepted_at ?? undefined, termsVersion: r.terms_version ?? undefined, emailVerifiedAt: r.email_verified_at ?? undefined,
  plan: r.plan ?? undefined, planUntil: r.plan_until ?? undefined, planStatus: r.plan_status ?? undefined, planNext: r.plan_next ?? undefined, asaasCustomerId: r.asaas_customer_id ?? undefined, asaasSubscriptionId: r.asaas_subscription_id ?? undefined });
const toGen = (r: any): Generation => ({
  id: r.id, userId: r.user_id, type: r.type, status: r.status, progress: r.progress, message: r.message ?? "", createdAt: r.created_at,
  finishedAt: r.finished_at ?? undefined, summary: r.summary, prompt: r.prompt ?? undefined, outputs: r.outputs ?? [], cost: r.cost,
  mock: r.mock, error: r.error ?? undefined, usage: r.usage ?? { images: 0, videoClips: 0 },
  projectId: r.project_id ?? null, favorite: r.favorite ?? false,
});
const toCoupon = (r: any): Coupon => ({ semCartao: !!r.sem_cartao, tipo: r.tipo ?? "acesso", desconto: Number(r.desconto ?? 0), code: r.code, creditos: r.creditos, dias: r.dias, plano: r.plano, limite: r.limite ?? null, validoAte: r.valido_ate ?? null, ativo: !!r.ativo, createdAt: r.created_at });
const toPush = (r: any): PushSub => ({ endpoint: r.endpoint, userId: r.user_id, p256dh: r.p256dh, auth: r.auth, createdAt: r.created_at });
const toShare = (r: any): Share => ({ token: r.token, userId: r.user_id, projectId: r.project_id, createdAt: r.created_at, revokedAt: r.revoked_at ?? null });
const toOffice = (r: any): Escritorio => ({ userId: r.user_id, nome: r.nome ?? "", responsavel: r.responsavel ?? "", registro: r.registro ?? "", cor: r.cor ?? "", logo: r.logo ?? null });
const toProject = (r: any): Project => ({ id: r.id, userId: r.user_id, name: r.name, createdAt: r.created_at });
/** erro de coluna/tabela inexistente: o SQL novo (supabase/schema.sql) ainda não foi executado */
const missingSchema = (e: { message: string } | null) => !!e && /project_id|favorite|projects|offices|shares|push_subs|coupons|schema cache|does not exist/i.test(e.message);

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
    const initial = d.signupCredits ?? env.signupCredits;
    const row = { id: uid(), email: d.email, name: d.name, pass_hash: d.passHash ?? null, google_id: d.googleId ?? null, credits: initial, ...(d.emailVerifiedAt ? { email_verified_at: d.emailVerifiedAt } : {}) };
    let { data, error } = await sb().from("users").insert({ ...row, terms_accepted_at: d.termsAcceptedAt, terms_version: d.termsVersion }).select("*").single();
    if (error && /terms_(accepted_at|version)/.test(error.message)) {
      // colunas do aceite ainda não criadas no Supabase (rodar supabase/schema.sql): cadastra sem elas para não derrubar o serviço
      console.warn("Colunas terms_accepted_at/terms_version ausentes no Supabase; aceite não gravado. Execute o ALTER do supabase/schema.sql.");
      ({ data, error } = await sb().from("users").insert(row).select("*").single());
    }
    check(error, "createUser");
    if (initial > 0) {
      const t = await sb().from("credit_txs").insert({ user_id: row.id, delta: initial, reason: "Créditos de boas-vindas" });
      check(t.error, "createUser/tx");
    }
    return toUser(data);
  },
  async setGoogleId(id, googleId) { check((await sb().from("users").update({ google_id: googleId }).eq("id", id)).error, "setGoogleId"); },
  async markEmailVerified(id) {
    const { data, error } = await sb().from("users").update({ email_verified_at: new Date().toISOString() }).eq("id", id).is("email_verified_at", null).select("id");
    if (error && /email_verified_at|schema cache/i.test(error.message)) throw new Error("Verificação de e-mail ainda não disponível: execute supabase/migracao-email.sql no Supabase.");
    check(error, "markEmailVerified");
    return (data ?? []).length > 0;
  },
  async setPassHash(id, passHash) { check((await sb().from("users").update({ pass_hash: passHash }).eq("id", id)).error, "setPassHash"); },
  async setPlan(userId, f) {
    const col: Record<string, string> = { plan: "plan", planUntil: "plan_until", planStatus: "plan_status", planNext: "plan_next", asaasCustomerId: "asaas_customer_id", asaasSubscriptionId: "asaas_subscription_id" };
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
  async countTxsByReason(reason) {
    const { count, error } = await sb().from("credit_txs").select("id", { count: "exact", head: true }).eq("reason", reason);
    check(error, "countTxsByReason");
    return count ?? 0;
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
  async listCoupons() {
    const { data, error } = await sb().from("coupons").select("*").order("created_at", { ascending: false });
    if (missingSchema(error)) return [];
    check(error, "listCoupons");
    return (data ?? []).map(toCoupon);
  },
  async getCoupon(code) {
    const { data, error } = await sb().from("coupons").select("*").eq("code", code.toLowerCase()).maybeSingle();
    if (missingSchema(error)) return null;
    check(error, "getCoupon");
    return data ? toCoupon(data) : null;
  },
  async saveCoupon(c) {
    const { error } = await sb().from("coupons").upsert({ code: c.code, sem_cartao: c.semCartao, tipo: c.tipo, desconto: c.desconto, creditos: c.creditos, dias: c.dias, plano: c.plano, limite: c.limite, valido_ate: c.validoAte, ativo: c.ativo });
    if (missingSchema(error)) throw new Error("Os cupons ainda não estão disponíveis: execute os SQLs novos (supabase/migracao-cupons.sql e supabase/migracao-cupons-desconto.sql e supabase/migracao-cupons-cartao.sql) no Supabase.");
    check(error, "saveCoupon");
  },
  async adminUsers() {
    const { data, error } = await sb().from("users").select("*").order("created_at", { ascending: false }).limit(5000);
    check(error, "adminUsers");
    return (data ?? []).map(toUser);
  },
  async adminGens(sinceIso) {
    const { data, error } = await sb().from("generations").select("*").gte("created_at", sinceIso).limit(10000);
    check(error, "adminGens");
    return (data ?? []).map(toGen);
  },
  async adminPayments() {
    const { data, error } = await sb().from("payments").select("*").limit(5000);
    if (missingSchema(error)) return [];
    check(error, "adminPayments");
    return (data ?? []).map((r: any): Payment => ({ provider: r.provider, refId: r.ref_id, userId: r.user_id, kind: r.kind, item: r.item, amount: Number(r.amount), createdAt: r.created_at }));
  },
  async listPushes(userId) {
    const { data, error } = await sb().from("push_subs").select("*").eq("user_id", userId);
    if (missingSchema(error)) return [];
    check(error, "listPushes");
    return (data ?? []).map(toPush);
  },
  async addPush(s) {
    const { error } = await sb().from("push_subs").upsert({ endpoint: s.endpoint, user_id: s.userId, p256dh: s.p256dh, auth: s.auth });
    if (missingSchema(error)) throw new Error("As notificações ainda não estão disponíveis: execute o SQL novo (supabase/migracao-push.sql) no Supabase.");
    check(error, "addPush");
  },
  async removePush(endpoint) {
    const { error } = await sb().from("push_subs").delete().eq("endpoint", endpoint);
    if (missingSchema(error)) return;
    check(error, "removePush");
  },
  async listShares(userId) {
    const { data, error } = await sb().from("shares").select("*").eq("user_id", userId).is("revoked_at", null);
    if (missingSchema(error)) return [];
    check(error, "listShares");
    return (data ?? []).map(toShare);
  },
  async getShare(token) {
    const { data, error } = await sb().from("shares").select("*").eq("token", token).is("revoked_at", null).maybeSingle();
    if (missingSchema(error)) return null;
    check(error, "getShare");
    return data ? toShare(data) : null;
  },
  async createShare(userId, projectId, token) {
    const { data, error } = await sb().from("shares").insert({ token, user_id: userId, project_id: projectId }).select("*").single();
    if (missingSchema(error)) throw new Error("Os links de apresentação ainda não estão disponíveis: execute o SQL novo (supabase/migracao-links.sql) no Supabase.");
    check(error, "createShare");
    return toShare(data);
  },
  async revokeShare(userId, token) {
    const { error } = await sb().from("shares").update({ revoked_at: new Date().toISOString() }).eq("token", token).eq("user_id", userId);
    if (missingSchema(error)) return;
    check(error, "revokeShare");
  },
  async getOffice(userId) {
    const { data, error } = await sb().from("offices").select("*").eq("user_id", userId).maybeSingle();
    if (missingSchema(error)) return null;
    check(error, "getOffice");
    return data ? toOffice(data) : null;
  },
  async saveOffice(o) {
    const { error } = await sb().from("offices").upsert({ user_id: o.userId, nome: o.nome, responsavel: o.responsavel, registro: o.registro, cor: o.cor, logo: o.logo, updated_at: new Date().toISOString() });
    if (missingSchema(error)) throw new Error("A marca do escritório ainda não está disponível: execute o SQL novo (supabase/migracao-escritorio.sql) no Supabase.");
    check(error, "saveOffice");
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
  async listSupport(limit) {
    const { data, error } = await sb().from("support_messages").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error && /support_messages|schema cache|does not exist/i.test(error.message)) return [];
    check(error, "listSupport");
    return (data ?? []).map((r: any): SupportMsg => ({ id: r.id, userId: r.user_id, email: r.email, subject: r.subject, message: r.message, createdAt: r.created_at }));
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
