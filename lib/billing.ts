import crypto from "node:crypto";
import { env } from "./config";
import { PACOTES, PLANOS } from "./costs";
import type { User } from "./db";
import { UserError } from "./errors";
import { activePlan, planById } from "./plans";
import { store } from "./store";

/**
 * Cobrança pelo Asaas (https://docs.asaas.com).
 * - Créditos avulsos: cobrança única (/payments). Plano: assinatura mensal (/subscriptions). O cliente escolhe Pix, boleto
 *   ou cartão na página de pagamento do próprio Asaas (billingType UNDEFINED).
 * - Divisão de receita: cada cobrança leva um `split` para a carteira do sócio (ASAAS_PARTNER_WALLET_ID, ASAAS_PARTNER_PERCENT).
 *   O Asaas calcula o percentual sobre o valor líquido (já descontadas as taxas) e o resto fica na conta que gera a cobrança.
 * - Os créditos só são concedidos pelo webhook, depois de consultar o pagamento na API do Asaas.
 */
const PROVIDER = "asaas";
const DAY = 86_400_000;

const base = () => process.env.ASAAS_API_BASE || (process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");
export const billingEnabled = () => !!process.env.ASAAS_API_KEY;
const live = () => process.env.NODE_ENV === "production" && process.env.ASAAS_ENV === "production";

async function asaas(path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(base() + path, {
    method: init.method || "GET",
    headers: { access_token: process.env.ASAAS_API_KEY || "", "Content-Type": "application/json", "User-Agent": "ArqIA" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Asaas ${res.status} em ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ------------------------------------------------------------------ divisão com o sócio
/** Percentual do sócio (padrão 30%). O restante fica com a conta dona da chave de API. */
export const partnerPercent = () => { const n = Number(process.env.ASAAS_PARTNER_PERCENT || 30); return Number.isFinite(n) && n > 0 && n < 100 ? n : 30; };

function splitRule() {
  const walletId = process.env.ASAAS_PARTNER_WALLET_ID;
  if (!walletId) {
    // em produção nenhuma cobrança sai sem a divisão combinada
    if (live()) throw new Error("ASAAS_PARTNER_WALLET_ID não definido: a divisão com o sócio não está configurada.");
    return undefined;
  }
  return [{ walletId, percentualValue: partnerPercent() }];
}

// ------------------------------------------------------------------ referência do pedido
export type Ref = { userId: string; kind: "pacote" | "plano"; item: string };
const encodeRef = (r: Ref) => `${r.userId}|${r.kind === "pacote" ? "pack" : "plan"}|${r.item}`;
export function parseRef(s: unknown): Ref | null {
  const [userId, kind, item] = String(s || "").split("|");
  if (!userId || !item) return null;
  if (kind === "pack" && PACOTES.some((p) => p.id === item)) return { userId, kind: "pacote", item };
  if (kind === "plan" && planById(item)) return { userId, kind: "plano", item };
  return null;
}
const priceOf = (r: Ref) => (r.kind === "pacote" ? PACOTES.find((p) => p.id === r.item)!.preco : planById(r.item)!.preco);

// ------------------------------------------------------------------ cliente e checkout
/** Valida CPF ou CNPJ pelos dígitos verificadores. */
export function validCpfCnpj(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (s: string, w: number[]) => { const n = s.split("").reduce((a, c, i) => a + Number(c) * w[i], 0) % 11; return n < 2 ? 0 : 11 - n; };
  if (d.length === 11) return calc(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[9]) && calc(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[10]);
  if (d.length === 14) return calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[12]) && calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[13]);
  return false;
}

async function ensureCustomer(u: User, cpfCnpj: string): Promise<string> {
  if (u.asaasCustomerId) return u.asaasCustomerId;
  if (!validCpfCnpj(cpfCnpj)) throw new UserError("Informe um CPF ou CNPJ válido para emitir a cobrança.");
  const c = await asaas("/customers", { method: "POST", body: { name: u.name || u.email, email: u.email, cpfCnpj: cpfCnpj.replace(/\D/g, ""), externalReference: u.id } });
  await store.setPlan(u.id, { asaasCustomerId: c.id });
  return c.id;
}

/** Data de hoje no horário de Brasília (AAAA-MM-DD), como o Asaas espera. */
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const success = () => ({ successUrl: `${env.appUrl}/app/creditos?pagamento=ok`, autoRedirect: true });

/** Cria a cobrança (ou assinatura) e devolve o link da página de pagamento do Asaas. */
export async function createCheckout(u: User, id: string, cpfCnpj: string): Promise<string> {
  const split = splitRule();
  const pack = PACOTES.find((p) => p.id === id);
  if (pack) {
    const customer = await ensureCustomer(u, cpfCnpj);
    const ref: Ref = { userId: u.id, kind: "pacote", item: pack.id };
    const p = await asaas("/payments", { method: "POST", body: {
      customer, billingType: "UNDEFINED", value: pack.preco, dueDate: today(), description: `ArqIA — ${pack.creditos} créditos`,
      externalReference: encodeRef(ref), split, callback: success(),
    } });
    return p.invoiceUrl;
  }
  const plan = planById(id);
  if (!plan) throw new UserError("Item inválido.");
  // uma assinatura por vez: para trocar de plano, cancele a renovação do atual antes
  if (activePlan(u) && u.planStatus !== "cancelado") throw new UserError("Você já tem uma assinatura ativa. Cancele a renovação do plano atual para contratar outro.");
  const customer = await ensureCustomer(u, cpfCnpj);
  // assinatura anterior que não virou plano (cliente abriu e não pagou) ou já cancelada: remove, para nunca haver duas cobrando
  if (u.asaasSubscriptionId) await asaas(`/subscriptions/${encodeURIComponent(u.asaasSubscriptionId)}`, { method: "DELETE" }).catch(() => undefined);
  const ref: Ref = { userId: u.id, kind: "plano", item: plan.id };
  const s = await asaas("/subscriptions", { method: "POST", body: {
    customer, billingType: "UNDEFINED", value: plan.preco, nextDueDate: today(), cycle: "MONTHLY", description: `ArqIA ${plan.nome} — plano mensal`,
    externalReference: encodeRef(ref), split, callback: success(),
  } });
  await store.setPlan(u.id, { asaasSubscriptionId: s.id });
  // a primeira cobrança da assinatura nasce logo em seguida: pega o link dela
  for (let i = 0; i < 6; i++) {
    const list = await asaas(`/subscriptions/${encodeURIComponent(s.id)}/payments?limit=1`);
    const url = list?.data?.[0]?.invoiceUrl;
    if (url) return url;
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error("assinatura criada sem cobrança");
}

/** Cancela a assinatura no Asaas. O plano continua valendo até o fim do período já pago. */
export async function cancelSubscription(u: User) {
  if (u.asaasSubscriptionId && billingEnabled()) await asaas(`/subscriptions/${encodeURIComponent(u.asaasSubscriptionId)}`, { method: "DELETE" });
  await store.setPlan(u.id, { planStatus: "cancelado" });
}

// ------------------------------------------------------------------ créditos do plano
/** Créditos do mês: soma o pacote mensal, mas o saldo nunca passa de 2 meses (o que sobra de um mês acumula no máximo mais um). */
async function grantMonthly(userId: string, planId: string, balance: number) {
  const p = planById(planId);
  if (!p) return;
  const add = Math.max(0, Math.min(p.creditosMes, 2 * p.creditosMes - balance));
  if (add > 0) await store.grant(userId, add, `Plano ${p.nome}: créditos do mês`);
}

// ------------------------------------------------------------------ webhook
/** Confere o token do webhook (cabeçalho asaas-access-token). Em produção o token é obrigatório. */
export function verifyWebhookToken(headers: Headers): boolean {
  const want = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!want) return process.env.NODE_ENV !== "production";
  const got = headers.get("asaas-access-token") || "";
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

/** Pagamento confirmado: concede créditos ou ativa/renova o plano. Idempotente: o mesmo pagamento só vale uma vez. */
async function applyPayment(pay: any) {
  if (!PAID.has(pay?.status)) return;
  let ref = parseRef(pay.externalReference);
  // cobranças geradas pela assinatura: a referência fica na assinatura
  if (!ref && pay.subscription) ref = parseRef((await asaas(`/subscriptions/${encodeURIComponent(pay.subscription)}`)).externalReference);
  if (!ref) return;
  const user = await store.getUser(ref.userId);
  if (!user) return;
  const paid = Number(pay.value);
  // o valor cobrado precisa bater com o catálogo: um pagamento menor não libera nada
  if (!Number.isFinite(paid) || paid + 0.005 < priceOf(ref)) { console.warn("pagamento com valor menor que o do catálogo:", pay.id, paid); return; }
  const fresh = await store.recordPayment({ provider: PROVIDER, refId: String(pay.id), userId: user.id, kind: ref.kind, item: ref.item, amount: paid, createdAt: new Date().toISOString() });
  if (!fresh) return;

  if (ref.kind === "pacote") {
    const p = PACOTES.find((x) => x.id === ref!.item)!;
    await store.grant(user.id, p.creditos, `Compra: ${p.creditos} créditos (${p.rotulo})`);
    return;
  }
  const plan = planById(ref.item)!;
  const now = Date.now();
  // renovação do mesmo plano soma ao que resta; troca de plano começa agora
  const from = activePlan(user) && user.plan === plan.id && user.planUntil ? Math.max(now, new Date(user.planUntil).getTime()) : now;
  await store.setPlan(user.id, { plan: plan.id, planUntil: new Date(from + 35 * DAY).toISOString(), planStatus: "ativo", ...(pay.subscription ? { asaasSubscriptionId: String(pay.subscription) } : {}) });
  await grantMonthly(user.id, plan.id, user.credits);
}

/** Reembolso ou chargeback: tira os créditos que ainda estiverem no saldo, ou encerra o plano. Uma vez só por pagamento. */
async function revokePayment(paymentId: string) {
  const original = await store.findPayment(PROVIDER, paymentId);
  if (!original) return;
  const first = await store.recordPayment({ ...original, refId: `refund:${paymentId}`, amount: 0, createdAt: new Date().toISOString() });
  if (!first) return;
  if (original.kind === "pacote") {
    const p = PACOTES.find((x) => x.id === original.item);
    const u = await store.getUser(original.userId);
    if (p && u) { const n = Math.min(p.creditos, u.credits); if (n > 0) await store.charge(u.id, n, `Estorno de pagamento: ${p.creditos} créditos (${p.rotulo})`); }
  } else {
    await store.setPlan(original.userId, { planUntil: new Date().toISOString(), planStatus: "cancelado" });
  }
}

export async function handleEvent(body: any) {
  const ev = String(body?.event || "");
  if (ev === "PAYMENT_CONFIRMED" || ev === "PAYMENT_RECEIVED") {
    const id = body?.payment?.id;
    if (id) await applyPayment(await asaas(`/payments/${encodeURIComponent(id)}`));
  } else if (ev === "PAYMENT_REFUNDED" || ev === "PAYMENT_CHARGEBACK_REQUESTED") {
    if (body?.payment?.id) await revokePayment(String(body.payment.id));
  } else if (ev === "SUBSCRIPTION_DELETED" || ev === "SUBSCRIPTION_INACTIVATED") {
    const u = body?.subscription?.id ? await store.getUserBySubscription(String(body.subscription.id)) : null;
    if (u) await store.setPlan(u.id, { planStatus: "cancelado" });
  }
}
