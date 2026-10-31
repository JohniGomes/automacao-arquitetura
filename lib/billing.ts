import crypto from "node:crypto";
import { env } from "./config";
import { PACOTES, PLANOS } from "./costs";
import type { User } from "./db";
import { activePlan, planById } from "./plans";
import { store } from "./store";

/**
 * Cobrança pelo Mercado Pago.
 * - Créditos avulsos e plano anual: pagamento único (Checkout Pro, "preference"). O anual vale 365 dias e libera os
 *   créditos mês a mês.
 * - Plano mensal: assinatura (preapproval). Cada cobrança aprovada renova o plano por mais ~35 dias e libera os créditos do mês.
 * Os créditos só são concedidos pelo webhook, depois de consultar o pagamento na API do Mercado Pago (nunca pelo que o navegador diz).
 */
const API = () => process.env.MP_API_BASE || "https://api.mercadopago.com";
const PROVIDER = "mercadopago";
const DAY = 86_400_000;

export const billingEnabled = () => !!process.env.MP_ACCESS_TOKEN;

async function mp(path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(API() + path, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mercado Pago ${res.status} em ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ------------------------------------------------------------------ referência do pedido
export type Ref =
  | { userId: string; kind: "pacote"; item: string }
  | { userId: string; kind: "plano"; item: string; interval: "mensal" | "anual" };

const encodeRef = (r: Ref) => (r.kind === "pacote" ? `${r.userId}|pack|${r.item}` : `${r.userId}|plan|${r.item}|${r.interval}`);
export function parseRef(s: unknown): Ref | null {
  const [userId, kind, item, interval] = String(s || "").split("|");
  if (!userId || !item) return null;
  if (kind === "pack" && PACOTES.some((p) => p.id === item)) return { userId, kind: "pacote", item };
  if (kind === "plan" && planById(item) && (interval === "mensal" || interval === "anual")) return { userId, kind: "plano", item, interval };
  return null;
}

/** Valor que o catálogo cobra por esta referência (usado para conferir o que o Mercado Pago recebeu). */
function priceOf(r: Ref): number {
  if (r.kind === "pacote") return PACOTES.find((p) => p.id === r.item)!.preco;
  const p = planById(r.item)!;
  return r.interval === "anual" ? p.anual : p.preco;
}

// ------------------------------------------------------------------ checkout
const back = (status: string) => `${env.appUrl}/app/creditos?pagamento=${status}`;

export async function createCheckout(u: User, id: string, interval: string): Promise<string> {
  const notification_url = `${env.appUrl}/api/billing/webhook`;
  const pack = PACOTES.find((p) => p.id === id);
  if (pack) {
    const ref: Ref = { userId: u.id, kind: "pacote", item: pack.id };
    const r = await mp("/checkout/preferences", { method: "POST", body: {
      items: [{ id: pack.id, title: `ArqIA — ${pack.creditos} créditos`, quantity: 1, unit_price: pack.preco, currency_id: "BRL" }],
      payer: { email: u.email }, external_reference: encodeRef(ref), notification_url,
      back_urls: { success: back("ok"), pending: back("pendente"), failure: back("erro") }, auto_return: "approved",
    } });
    return r.init_point;
  }
  const plan = planById(id);
  if (!plan) throw new Error("Item inválido.");
  const iv = interval === "anual" ? "anual" : "mensal";
  const ref: Ref = { userId: u.id, kind: "plano", item: plan.id, interval: iv };
  if (iv === "anual") {
    const r = await mp("/checkout/preferences", { method: "POST", body: {
      items: [{ id: `${plan.id}-anual`, title: `ArqIA ${plan.nome} — plano anual`, quantity: 1, unit_price: plan.anual, currency_id: "BRL" }],
      payer: { email: u.email }, external_reference: encodeRef(ref), notification_url,
      back_urls: { success: back("ok"), pending: back("pendente"), failure: back("erro") }, auto_return: "approved",
    } });
    return r.init_point;
  }
  const r = await mp("/preapproval", { method: "POST", body: {
    reason: `ArqIA ${plan.nome} — plano mensal`, external_reference: encodeRef(ref), payer_email: u.email, back_url: back("ok"),
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.preco, currency_id: "BRL" }, status: "pending",
  } });
  return r.init_point;
}

/** Cancela a assinatura mensal no Mercado Pago. O plano continua valendo até o fim do período já pago. */
export async function cancelSubscription(u: User) {
  if (u.mpSubscriptionId && billingEnabled()) await mp(`/preapproval/${encodeURIComponent(u.mpSubscriptionId)}`, { method: "PUT", body: { status: "cancelled" } });
  await store.setPlan(u.id, { planStatus: "cancelado" });
}

// ------------------------------------------------------------------ créditos do plano
/** Créditos do mês: soma o pacote mensal, mas o saldo nunca passa de 2 meses (o que sobra de um mês acumula no máximo mais um). */
async function grantMonthly(userId: string, planId: string, balance: number, label: string): Promise<number> {
  const p = planById(planId);
  if (!p) return balance;
  const add = Math.max(0, Math.min(p.creditosMes, 2 * p.creditosMes - balance));
  if (add > 0) await store.grant(userId, add, `Plano ${p.nome}: ${label}`);
  return balance + add;
}

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

/** Plano anual: libera os créditos dos meses que já chegaram (sem precisar de agendador; roda quando a conta é usada). */
export async function releaseDueCredits(u: User): Promise<User> {
  if (u.planInterval !== "anual" || !u.nextCreditAt || !activePlan(u)) return u;
  let next = new Date(u.nextCreditAt);
  const until = new Date(u.planUntil!);
  let balance = u.credits, n = 0;
  while (next.getTime() <= Date.now() && next.getTime() < until.getTime() && n < 12) {
    balance = await grantMonthly(u.id, u.plan!, balance, "créditos do mês");
    next = addMonths(next, 1);
    n++;
  }
  if (!n) return u;
  await store.setPlan(u.id, { nextCreditAt: next.toISOString() });
  return (await store.getUser(u.id)) ?? u;
}

// ------------------------------------------------------------------ webhook
/** Confere a assinatura do webhook (cabeçalho x-signature). Em produção o segredo é obrigatório. */
export function verifySignature(headers: Headers, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const sig = headers.get("x-signature") || "";
  const ts = /ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${headers.get("x-request-id") || ""};ts:${ts};`;
  const want = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return v1.length === want.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(want));
}

/** Pagamento aprovado: concede créditos ou ativa/renova o plano. Idempotente: o mesmo pagamento só vale uma vez. */
async function applyPayment(pay: any) {
  if (pay?.status !== "approved") return;
  const ref = parseRef(pay.external_reference);
  if (!ref) return;
  const user = await store.getUser(ref.userId);
  if (!user) return;
  const paid = Number(pay.transaction_amount);
  // o valor pago precisa bater com o catálogo: um pagamento menor não libera nada
  if (!Number.isFinite(paid) || paid + 0.005 < priceOf(ref)) { console.warn("pagamento com valor menor que o do catálogo:", pay.id, paid); return; }
  const fresh = await store.recordPayment({ provider: PROVIDER, refId: String(pay.id), userId: user.id, kind: ref.kind, item: ref.item, amount: paid, createdAt: new Date().toISOString() });
  if (!fresh) return;

  if (ref.kind === "pacote") {
    const p = PACOTES.find((x) => x.id === ref.item)!;
    await store.grant(user.id, p.creditos, `Compra: ${p.creditos} créditos (${p.rotulo})`);
    return;
  }
  const plan = planById(ref.item)!;
  const now = Date.now();
  const base = activePlan(user) && user.plan === plan.id && user.planUntil ? Math.max(now, new Date(user.planUntil).getTime()) : now;
  if (ref.interval === "anual") {
    await store.setPlan(user.id, { plan: plan.id, planInterval: "anual", planUntil: new Date(base + 365 * DAY).toISOString(), planStatus: "ativo", nextCreditAt: addMonths(new Date(), 1).toISOString() });
  } else {
    await store.setPlan(user.id, { plan: plan.id, planInterval: "mensal", planUntil: new Date(base + 35 * DAY).toISOString(), planStatus: "ativo", nextCreditAt: null });
  }
  await grantMonthly(user.id, plan.id, user.credits, "créditos do mês");
}

/** Assinatura mensal: vincula a assinatura à conta e acompanha cancelamentos. */
async function applyPreapproval(sub: any) {
  const ref = parseRef(sub?.external_reference);
  if (!ref || ref.kind !== "plano") return;
  const user = await store.getUser(ref.userId);
  if (!user) return;
  if (sub.id && user.mpSubscriptionId !== sub.id) await store.setPlan(user.id, { mpSubscriptionId: String(sub.id) });
  if (sub.status === "cancelled" || sub.status === "paused") await store.setPlan(user.id, { planStatus: "cancelado" });
  else if (sub.status === "authorized" && user.planStatus === "cancelado" && user.mpSubscriptionId === sub.id) await store.setPlan(user.id, { planStatus: "ativo" });
}

export async function handleNotification(type: string, dataId: string) {
  if (!dataId) return;
  if (type === "payment") await applyPayment(await mp(`/v1/payments/${encodeURIComponent(dataId)}`));
  else if (type === "subscription_preapproval") await applyPreapproval(await mp(`/preapproval/${encodeURIComponent(dataId)}`));
}
