import * as webpush from "web-push";
import type { Generation } from "./db";
import { store } from "./store";

/**
 * Notificações push (Web Push + VAPID). Só ficam ativas se as três variáveis existirem; sem elas o app funciona normalmente,
 * apenas sem o botão de ativar avisos. Gere o par de chaves com `npx web-push generate-vapid-keys`.
 */
const pub = () => process.env.VAPID_PUBLIC_KEY || "";
const priv = () => process.env.VAPID_PRIVATE_KEY || "";
const subject = () => process.env.VAPID_SUBJECT || "mailto:contato@appcroqui.com.br";

export const pushAtivo = () => !!pub() && !!priv();
export const chavePublica = () => pub();

let pronto = false;
function init() {
  if (pronto) return;
  webpush.setVapidDetails(subject(), pub(), priv());
  pronto = true;
}

export type Aviso = { titulo: string; texto: string; url: string; tag?: string };

/** Envia o aviso a todos os aparelhos do usuário; inscrições que o navegador já cancelou (404/410) são apagadas. */
export async function enviarAviso(userId: string, aviso: Aviso): Promise<number> {
  if (!pushAtivo()) return 0;
  init();
  const subs = await store.listPushes(userId);
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 24 });
      ok++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await store.removePush(s.endpoint).catch(() => {});
      else console.error("push falhou:", e?.statusCode || e?.message || e);
    }
  }));
  return ok;
}

/** Aviso de fim de geração (pronta ou com falha). Cancelamentos não avisam. */
export async function notificarGeracao(gen: Generation) {
  if (!pushAtivo()) return;
  if (gen.status !== "done" && gen.status !== "error") return;
  const pronto = gen.status === "done";
  await enviarAviso(gen.userId, {
    titulo: pronto ? "Sua geração está pronta" : "A geração não foi concluída",
    texto: (gen.summary || gen.message || "").slice(0, 120),
    url: `/app/geracoes#g-${gen.id}`,
    tag: gen.id,
  });
}
