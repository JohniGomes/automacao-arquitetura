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
 * - Divisão de receita (opcional): com ASAAS_PARTNER_WALLET_ID definido, cada cobrança leva um `split` para a carteira do sócio
 *   (ASAAS_PARTNER_PERCENT). O Asaas calcula o percentual sobre o valor líquido (já descontadas as taxas) e o resto fica na conta
 *   que gera a cobrança. Sem o walletId, 100% fica na conta dona da chave de API.
 * - Os créditos só são concedidos pelo webhook, depois de consultar o pagamento na API do Asaas.
 */
const PROVIDER = "asaas";
const DAY = 86_400_000;

const base = () => process.env.ASAAS_API_BASE || (process.env.ASAAS_ENV?.trim().toLowerCase() === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");
export const billingEnabled = () => !!process.env.ASAAS_API_KEY?.trim();

async function asaas(path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(base() + path, {
    method: init.method || "GET",
    headers: { access_token: (process.env.ASAAS_API_KEY || "").trim(), "Content-Type": "application/json", "User-Agent": "ArqIA" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Asaas ${res.status} em ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ------------------------------------------------------------------ divisão com o sócio
/** Percentual do sócio quando houver walletId (padrão 30%). O restante fica com a conta dona da chave de API. */
export const partnerPercent = () => { const n = Number(process.env.ASAAS_PARTNER_PERCENT || 30); return Number.isFinite(n) && n > 0 && n < 100 ? n : 30; };

function splitRule() {
  const walletId = process.env.ASAAS_PARTNER_WALLET_ID?.trim();
  // sem walletId não há divisão: 100% vai para a conta dona da chave de API
  if (!walletId) return undefined;
  return [{ walletId, percentualValue: partnerPercent() }];
}

// ------------------------------------------------------------------ referência do pedido
export type Ref = { userId: string; kind: "pacote" | "plano" | "troca"; item: string };
const encodeRef = (r: Ref) => `${r.userId}|${r.kind === "pacote" ? "pack" : r.kind === "troca" ? "up" : "plan"}|${r.item}`;
export function parseRef(s: unknown): Ref | null {
  const [userId, kind, item] = String(s || "").split("|");
  if (!userId || !item) return null;
  if (kind === "pack" && PACOTES.some((p) => p.id === item)) return { userId, kind: "pacote", item };
  if (kind === "plan" && planById(item)) return { userId, kind: "plano", item };
  if (kind === "up" && planById(item)) return { userId, kind: "troca", item };
  return null;
}
// troca de plano: a cobrança é só a diferença proporcional (mínimo do cartão no Asaas: R$ 5)
const MIN_CARD = 5;
const priceOf = (r: Ref) => (r.kind === "pacote" ? PACOTES.find((p) => p.id === r.item)!.preco : r.kind === "troca" ? MIN_CARD : planById(r.item)!.preco);

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

// ------------------------------------------------------------------ checkout próprio (Pix e cartão, sem boleto)
/** Créditos avulsos: Pix ou cartão. Plano mensal: só cartão (renovação automática). */
export type Method = "PIX" | "CREDIT_CARD";
/** Dados do cartão: vão do navegador direto para a API do Asaas e nunca são gravados nem registrados em log. */
export type CardInput = { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string; postalCode: string; addressNumber: string; phone: string };
export type CheckoutResult =
  | { kind: "pix"; paymentId: string; image: string; payload: string; expiresAt?: string }
  | { kind: "card"; paymentId: string; status: string }
  /** troca de plano sem cobrança agora: já valeu ("done") ou fica agendada para a próxima renovação ("scheduled") */
  | { kind: "done" }
  | { kind: "scheduled"; at: string };

const digits = (s: string) => String(s || "").replace(/\D/g, "");

/** Confere o cartão (Luhn, validade e CVV) antes de enviar ao Asaas. */
export function validateCard(c: CardInput): string | null {
  const n = digits(c.number);
  if (n.length < 13 || n.length > 19) return "Número do cartão inválido.";
  let sum = 0;
  for (let i = 0; i < n.length; i++) { let d = Number(n[n.length - 1 - i]); if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; }
  // os cartões de teste do sandbox do Asaas (ex.: 4444 4444 4444 4444) não passam no dígito verificador; em produção passam todos os reais
  const sandbox = process.env.ASAAS_ENV?.trim().toLowerCase() !== "production";
  if (!sandbox && sum % 10) return "Número do cartão inválido.";
  const mm = Number(c.expiryMonth), yy = Number(c.expiryYear);
  if (!(mm >= 1 && mm <= 12) || c.expiryYear.length !== 4) return "Validade do cartão inválida.";
  const now = new Date();
  if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) return "Cartão vencido.";
  if (!/^\d{3,4}$/.test(c.ccv)) return "Código de segurança inválido.";
  if (String(c.holderName || "").trim().length < 3) return "Informe o nome impresso no cartão.";
  if (digits(c.postalCode).length !== 8) return "Informe um CEP válido (8 dígitos).";
  if (!String(c.addressNumber || "").trim()) return "Informe o número do endereço.";
  if (digits(c.phone).length < 10) return "Informe um telefone com DDD.";
  return null;
}

/** Tira de uma mensagem de erro qualquer sequência longa de números (por segurança, nada parecido com cartão vai para o log). */
export const scrub = (m: string) => m.replace(/\d{9,}/g, "[…]");

function cardFields(u: User, cpfCnpj: string, c: CardInput, ip: string) {
  return {
    creditCard: { holderName: c.holderName.trim(), number: digits(c.number), expiryMonth: String(c.expiryMonth).padStart(2, "0"), expiryYear: c.expiryYear, ccv: c.ccv },
    creditCardHolderInfo: { name: c.holderName.trim(), email: u.email, cpfCnpj: digits(cpfCnpj), postalCode: digits(c.postalCode), addressNumber: String(c.addressNumber).trim(), phone: digits(c.phone) },
    remoteIp: ip,
  };
}

/** Primeira cobrança de uma assinatura (ela nasce logo depois de criar a assinatura). */
async function firstPayment(subId: string): Promise<any> {
  for (let i = 0; i < 8; i++) {
    const list = await asaas(`/subscriptions/${encodeURIComponent(subId)}/payments?limit=1`);
    if (list?.data?.[0]) return list.data[0];
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error("assinatura criada sem cobrança");
}

/** Dados de pagamento da cobrança, conforme o método escolhido. */
async function present(p: any, method: Method): Promise<CheckoutResult> {
  const paymentId = String(p.id);
  if (method === "PIX") {
    const q = await asaas(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
    return { kind: "pix", paymentId, image: q.encodedImage, payload: q.payload, expiresAt: q.expirationDate };
  }
  return { kind: "card", paymentId, status: String(p.status || "PENDING") };
}

/**
 * Cria a cobrança (pacote) ou a assinatura mensal (plano) no Asaas já com o método escolhido e devolve o que a tela
 * precisa mostrar: QR Code Pix ou o resultado do cartão. Os créditos só entram pelo webhook.
 */
export async function createCheckout(u: User, id: string, method: Method, cpfCnpj: string, card?: CardInput, ip = ""): Promise<CheckoutResult> {
  if (method !== "PIX" && method !== "CREDIT_CARD") throw new UserError("Forma de pagamento inválida.");
  // quem já tem plano ativo troca de plano com valor proporcional (sem criar outra assinatura)
  if (planById(id) && activePlan(u) && u.planStatus !== "cancelado" && u.asaasSubscriptionId) return changePlan(u, id, method, cpfCnpj, card, ip);
  if (method === "CREDIT_CARD") {
    const bad = card ? validateCard(card) : "Informe os dados do cartão.";
    if (bad) throw new UserError(bad);
  }
  const split = splitRule();
  const pack = PACOTES.find((p) => p.id === id);
  const plan = pack ? null : planById(id);
  if (!pack && !plan) throw new UserError("Item inválido.");
  // a assinatura mensal só é cobrada no cartão: o Pix serve apenas para créditos avulsos
  if (plan && method !== "CREDIT_CARD") throw new UserError("Planos são pagos somente no cartão de crédito.");
  if (plan && activePlan(u) && u.planStatus !== "cancelado") throw new UserError("Você já tem uma assinatura ativa. Cancele a renovação do plano atual para contratar outro.");
  const customer = await ensureCustomer(u, cpfCnpj);
  // o titular do cartão informa o próprio CPF/CNPJ (o Asaas confere com o banco emissor)
  if (method === "CREDIT_CARD" && !validCpfCnpj(cpfCnpj)) throw new UserError("Informe o CPF ou CNPJ do titular do cartão.");
  const cardPart = method === "CREDIT_CARD" ? cardFields(u, cpfCnpj, card!, ip || "0.0.0.0") : {};
  try {
    if (pack) {
      const ref: Ref = { userId: u.id, kind: "pacote", item: pack.id };
      const p = await asaas("/payments", { method: "POST", body: {
        customer, billingType: method, value: pack.preco, dueDate: today(), description: `ArqIA — ${pack.creditos} créditos`,
        externalReference: encodeRef(ref), split, ...cardPart,
      } });
      return await present(p, method);
    }
    // assinatura anterior que não virou plano (cliente abriu e não pagou) ou já cancelada: remove, para nunca haver duas cobrando
    if (u.asaasSubscriptionId) await asaas(`/subscriptions/${encodeURIComponent(u.asaasSubscriptionId)}`, { method: "DELETE" }).catch(() => undefined);
    const ref: Ref = { userId: u.id, kind: "plano", item: plan!.id };
    const s = await asaas("/subscriptions", { method: "POST", body: {
      customer, billingType: method, value: plan!.preco, nextDueDate: today(), cycle: "MONTHLY", description: `ArqIA ${plan!.nome} — plano mensal`,
      externalReference: encodeRef(ref), split, ...cardPart,
    } });
    await store.setPlan(u.id, { asaasSubscriptionId: s.id });
    return await present(await firstPayment(s.id), method);
  } catch (e) {
    const msg = (e as Error).message || "";
    if (e instanceof UserError) throw e;
    if (method === "CREDIT_CARD" && /invalid_creditCard|not authorized|n[ãa]o autorizad|recusad/i.test(msg)) throw new UserError("Cartão recusado. Confira os dados ou use outro cartão.");
    throw new Error(scrub(msg));
  }
}

/** O pagamento já foi confirmado (e os créditos liberados) pelo webhook? Só responde para o dono do pagamento. */
export async function paymentPaid(userId: string, paymentId: string): Promise<boolean> {
  const p = await store.findPayment(PROVIDER, paymentId);
  return !!p && p.userId === userId;
}

/** Cancela a assinatura no Asaas. O plano continua valendo até o fim do período já pago. */
export async function cancelSubscription(u: User) {
  if (u.asaasSubscriptionId && billingEnabled()) await asaas(`/subscriptions/${encodeURIComponent(u.asaasSubscriptionId)}`, { method: "DELETE" });
  await store.setPlan(u.id, { planStatus: "cancelado", planNext: null });
}

// ------------------------------------------------------------------ troca de plano
export type ChangeQuote = {
  mode: "upgrade" | "downgrade" | "keep";
  /** a cobrar agora (R$) — só no upgrade; abaixo de R$ 5 a troca vale sem cobrança */
  amount: number;
  /** créditos extras do mês, proporcionais ao que falta do período */
  extraCredits: number;
  /** próxima renovação (ISO) */
  nextDue: string;
  newPrice: number;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Simula a troca do plano atual para `targetId`: upgrade cobra a diferença proporcional ao que falta do período; downgrade vale na renovação. */
export async function changeQuote(u: User, targetId: string): Promise<ChangeQuote | null> {
  const cur = activePlan(u), target = planById(targetId);
  if (!cur || !target || u.planStatus === "cancelado" || !u.asaasSubscriptionId) return null;
  const sub = await asaas(`/subscriptions/${encodeURIComponent(u.asaasSubscriptionId)}`).catch(() => null);
  const nextDue = sub?.nextDueDate ? new Date(`${sub.nextDueDate}T12:00:00Z`) : new Date(new Date(u.planUntil!).getTime() - 5 * DAY);
  const prev = new Date(nextDue);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const fraction = Math.min(1, Math.max(0, (nextDue.getTime() - Date.now()) / (nextDue.getTime() - prev.getTime())));
  const base = { nextDue: nextDue.toISOString(), newPrice: target.preco };
  if (target.id === cur.id) return u.planNext ? { mode: "keep", amount: 0, extraCredits: 0, ...base } : null;
  if (target.preco < cur.preco) return { mode: "downgrade", amount: 0, extraCredits: 0, ...base };
  return {
    mode: "upgrade", amount: round2((target.preco - cur.preco) * fraction),
    extraCredits: Math.max(0, Math.round((target.creditosMes - cur.creditosMes) * fraction)), ...base,
  };
}

/** Aponta a assinatura (valor e referência) para o plano `planId`; as cobranças futuras já saem com ele. */
async function setSubscriptionPlan(subId: string, userId: string, planId: string) {
  const p = planById(planId)!;
  await asaas(`/subscriptions/${encodeURIComponent(subId)}`, { method: "PUT", body: {
    value: p.preco, description: `ArqIA ${p.nome} — plano mensal`, externalReference: encodeRef({ userId, kind: "plano", item: p.id }), updatePendingPayments: true,
  } });
}

async function changePlan(u: User, targetId: string, method: Method, cpfCnpj: string, card: CardInput | undefined, ip: string): Promise<CheckoutResult> {
  const q = await changeQuote(u, targetId);
  const target = planById(targetId)!;
  if (!q) throw new UserError("Esta troca de plano não está disponível.");
  try {
    if (q.mode === "keep") {
      await setSubscriptionPlan(u.asaasSubscriptionId!, u.id, u.plan!);
      await store.setPlan(u.id, { planNext: null });
      return { kind: "done" };
    }
    if (q.mode === "downgrade") {
      await setSubscriptionPlan(u.asaasSubscriptionId!, u.id, target.id);
      await store.setPlan(u.id, { planNext: target.id });
      return { kind: "scheduled", at: q.nextDue };
    }
    if (q.amount < MIN_CARD) {
      // sobra tão pouco do período que a diferença nem chega ao valor mínimo do cartão: a troca vale sem cobrança
      await applyUpgradeNow(u, target.id, q.extraCredits);
      return { kind: "done" };
    }
    if (method !== "CREDIT_CARD") throw new UserError("A troca de plano é paga no cartão de crédito.");
    const bad = card ? validateCard(card) : "Informe os dados do cartão.";
    if (bad) throw new UserError(bad);
    if (!validCpfCnpj(cpfCnpj)) throw new UserError("Informe o CPF ou CNPJ do titular do cartão.");
    const customer = await ensureCustomer(u, cpfCnpj);
    const p = await asaas("/payments", { method: "POST", body: {
      customer, billingType: "CREDIT_CARD", value: q.amount, dueDate: today(), description: `ArqIA — troca para o plano ${target.nome} (valor proporcional)`,
      externalReference: encodeRef({ userId: u.id, kind: "troca", item: target.id }), split: splitRule(), ...cardFields(u, cpfCnpj, card!, ip || "0.0.0.0"),
    } });
    return await present(p, "CREDIT_CARD");
  } catch (e) {
    const msg = (e as Error).message || "";
    if (e instanceof UserError) throw e;
    if (/invalid_creditCard|not authorized|n[ãa]o autorizad|recusad/i.test(msg)) throw new UserError("Cartão recusado. Confira os dados ou use outro cartão.");
    throw new Error(scrub(msg));
  }
}

/** Efetiva o upgrade: assinatura no novo valor, plano novo agora (a data de renovação não muda) e créditos extras do período. */
async function applyUpgradeNow(user: User, targetId: string, credits: number) {
  const target = planById(targetId)!;
  // se o Asaas falhar aqui, o plano novo vale e a próxima cobrança sai no valor antigo (corrigir a assinatura à mão)
  if (user.asaasSubscriptionId) await setSubscriptionPlan(user.asaasSubscriptionId, user.id, target.id).catch((e) => console.error("assinatura não atualizada:", scrub(String(e?.message))));
  await store.setPlan(user.id, { plan: target.id, planNext: null, planStatus: "ativo" });
  if (credits > 0) await store.grant(user.id, credits, `Troca para o plano ${target.nome}: créditos proporcionais`);
}

/** Pagamento da diferença confirmado. Idempotente por pagamento (quem chama já registrou o pagamento). */
async function applyUpgrade(user: User, targetId: string, paid: number) {
  const cur = activePlan(user), target = planById(targetId);
  if (!cur || !target || target.preco <= cur.preco || !user.asaasSubscriptionId) { console.warn("troca de plano paga mas não aplicável:", user.id, targetId); return; }
  const diff = target.preco - cur.preco;
  const credits = Math.round((target.creditosMes - cur.creditosMes) * Math.min(1, paid / diff));
  await applyUpgradeNow(user, target.id, credits);
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
  const want = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
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
  const fresh = await store.recordPayment({ provider: PROVIDER, refId: String(pay.id), userId: user.id, kind: ref.kind === "pacote" ? "pacote" : "plano", item: ref.kind === "troca" ? `up:${ref.item}:${activePlan(user)?.id ?? ""}` : ref.item, amount: paid, createdAt: new Date().toISOString() });
  if (!fresh) return;

  if (ref.kind === "pacote") {
    const p = PACOTES.find((x) => x.id === ref!.item)!;
    await store.grant(user.id, p.creditos, `Compra: ${p.creditos} créditos (${p.rotulo})`);
    return;
  }
  if (ref.kind === "troca") { await applyUpgrade(user, ref.item, paid); return; }
  const plan = planById(ref.item)!;
  const now = Date.now();
  // renovação do mesmo plano soma ao que resta; troca de plano começa agora
  const from = activePlan(user) && user.plan === plan.id && user.planUntil ? Math.max(now, new Date(user.planUntil).getTime()) : now;
  await store.setPlan(user.id, { plan: plan.id, planUntil: new Date(from + 35 * DAY).toISOString(), planStatus: "ativo", planNext: null, ...(pay.subscription ? { asaasSubscriptionId: String(pay.subscription) } : {}) });
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
  } else if (original.item.startsWith("up:")) {
    // estorno da diferença de uma troca: volta ao plano anterior (e ao valor dele na assinatura)
    const [, , from] = original.item.split(":");
    const u = await store.getUser(original.userId), prev = planById(from);
    if (u && prev) {
      if (u.asaasSubscriptionId) await setSubscriptionPlan(u.asaasSubscriptionId, u.id, prev.id).catch((e) => console.error("reverter assinatura:", scrub(String(e?.message))));
      await store.setPlan(u.id, { plan: prev.id, planNext: null });
    }
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
