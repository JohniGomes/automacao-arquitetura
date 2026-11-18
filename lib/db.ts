import fs from "node:fs";
import path from "node:path";

export type GenType = "mapa" | "moodboard" | "render" | "luz" | "filme" | "melhorar" | "esboco" | "ideias" | "editor" | "angulos";
export type User = { id: string; email: string; name: string; passHash?: string; googleId?: string; credits: number; createdAt: string; termsAcceptedAt?: string; termsVersion?: string;
  /** quando o e-mail foi confirmado (login com Google já nasce confirmado) */
  emailVerifiedAt?: string;
  /** plano ativo (essencial | profissional | max) e quando vale; ver lib/plans.ts */
  plan?: string; planUntil?: string; planStatus?: "ativo" | "cancelado"; planNext?: string; asaasCustomerId?: string; asaasSubscriptionId?: string };
export type Payment = { provider: string; refId: string; userId: string; kind: "pacote" | "plano"; item: string; amount: number; createdAt: string };
export type PlanFields = Pick<User, "plan" | "planUntil" | "planStatus" | "planNext" | "asaasCustomerId" | "asaasSubscriptionId">;
export type Output = { file: string; kind: "image" | "video" | "file"; label?: string };
export type Generation = {
  id: string; userId: string; type: GenType; status: "queued" | "running" | "done" | "error";
  progress: number; message: string; createdAt: string; finishedAt?: string;
  summary: string; prompt?: string; outputs: Output[]; cost: number; mock: boolean; error?: string;
  /** consumo real de API, para medir custos */
  usage: { images: number; videoClips: number };
  projectId?: string | null;
  favorite?: boolean;
  /** créditos já devolvidos durante o processamento (falha parcial); não vai para o banco */
  refunded?: number;
  /** pedido de cancelamento (só o filme para no meio); não vai para o banco */
  cancel?: boolean;
};
/** Marca do escritório usada nas pranchas (plano Max). `logo` é o nome do arquivo guardado. */
export type Escritorio = { userId: string; nome: string; responsavel: string; registro: string; cor: string; logo: string | null };
/** Link público de apresentação de um projeto (somente leitura, revogável). */
export type Share = { token: string; userId: string; projectId: string; createdAt: string; revokedAt?: string | null };
/** Inscrição de notificação push de um aparelho (Web Push). */
export type PushSub = { endpoint: string; userId: string; p256dh: string; auth: string; createdAt: string };
/** Cupom criado no painel de administração: dá plano + créditos por alguns dias. Os créditos expiram junto com o plano. */
/** tipo: "acesso" dá plano + créditos por alguns dias; "percentual" (desconto em %) e "valor" (desconto em R$) abatem o primeiro mês de uma assinatura. */
export type Coupon = { /** acesso sem cobrança e sem cartão (só o VDO Club); os demais cupons de acesso pedem o cartão e cobram ao fim do período */ semCartao: boolean; tipo: "acesso" | "percentual" | "valor"; desconto: number; code: string; creditos: number; dias: number; plano: string; limite: number | null; validoAte: string | null; ativo: boolean; createdAt: string };
export type Project = { id: string; userId: string; name: string; createdAt: string };
export type Tx = { id: string; userId: string; delta: number; reason: string; genId?: string; at: string };
export type SupportMsg = { id: string; userId: string; email: string; subject: string; message: string; createdAt: string };
type DB = { users: User[]; generations: Generation[]; txs: Tx[]; projects: Project[]; support?: SupportMsg[]; payments?: Payment[]; offices?: Escritorio[]; shares?: Share[]; pushes?: PushSub[]; coupons?: Coupon[] };

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data"); // no Render: disco persistente, ex. /var/data
const FILE = path.join(DATA_DIR, "db.json");

const g = globalThis as unknown as { __db?: DB };

export function db(): DB {
  if (g.__db) return g.__db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  g.__db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { users: [], generations: [], txs: [], projects: [] };
  g.__db!.projects ??= [];
  g.__db!.support ??= [];
  g.__db!.payments ??= [];
  g.__db!.offices ??= [];
  g.__db!.shares ??= [];
  g.__db!.pushes ??= [];
  g.__db!.coupons ??= [];
  return g.__db!;
}
export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db(), null, 2));
  fs.renameSync(tmp, FILE);
}
export const uid = () => crypto.randomUUID();
