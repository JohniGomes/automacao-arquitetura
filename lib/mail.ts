import { env } from "./config";
import type { Lang } from "./i18n";

/**
 * Envio de e-mail pela API do Resend (https://resend.com), sem SDK. Precisa de RESEND_API_KEY e, para sair de um domínio
 * próprio, MAIL_FROM (ex.: "Croqui <contato@appcroqui.com.br>") com o domínio verificado no Resend.
 */
export const mailEnabled = () => !!process.env.RESEND_API_KEY?.trim();
/** Cadastro exige e-mail confirmado quando o envio de e-mail está configurado (REQUIRE_EMAIL_VERIFICATION=false desliga). */
export const requireEmailVerification = () => mailEnabled() && process.env.REQUIRE_EMAIL_VERIFICATION !== "false";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendMail(m: { to: string; subject: string; html: string; text?: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Croqui <onboarding@resend.dev>", to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // o motivo vem do Resend (domínio não verificado, destinatário recusado, chave inválida…) e vai para o log do servidor
    const j = await res.json().catch(() => null);
    throw new Error(`Resend ${res.status}: ${String(j?.message || j?.name || "sem detalhe").slice(0, 200)}`);
  }
  return true;
}

function layout(title: string, body: string, button: { label: string; url: string }, foot: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2b24">
<h2 style="margin:0 0 16px">${esc(title)}</h2>${body}
<p style="margin:24px 0"><a href="${esc(button.url)}" style="background:#486152;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">${esc(button.label)}</a></p>
<p style="font-size:12px;color:#5b6b61">${esc(foot)}<br>${esc(button.url)}</p></div>`;
}

const T = {
  pt: {
    verifySubject: "Confirme seu e-mail no Croqui", verifyTitle: "Confirme seu e-mail", verifyBody: "Falta só um passo: confirme que este e-mail é seu para liberar as gerações e os créditos de boas-vindas.", verifyBtn: "Confirmar e-mail", verifyFoot: "O link vale por 48 horas. Se você não criou uma conta no Croqui, ignore este e-mail.",
    resetSubject: "Redefinir sua senha do Croqui", resetTitle: "Redefinir senha", resetBody: "Recebemos um pedido para redefinir a senha da sua conta. Se foi você, use o botão abaixo.", resetBtn: "Criar nova senha", resetFoot: "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
  },
  en: {
    verifySubject: "Confirm your email on Croqui", verifyTitle: "Confirm your email", verifyBody: "One last step: confirm this email is yours to unlock generations and your welcome credits.", verifyBtn: "Confirm email", verifyFoot: "The link is valid for 48 hours. If you didn't create an Croqui account, ignore this email.",
    resetSubject: "Reset your Croqui password", resetTitle: "Reset password", resetBody: "We received a request to reset your account password. If it was you, use the button below.", resetBtn: "Create new password", resetFoot: "The link is valid for 1 hour and can be used once. If it wasn't you, ignore this email: your password stays the same.",
  },
} as const;

export function sendVerifyMail(to: string, token: string, lang: Lang) {
  const t = T[lang], url = `${env.appUrl}/verificar?token=${encodeURIComponent(token)}`;
  return sendMail({ to, subject: t.verifySubject, html: layout(t.verifyTitle, `<p>${esc(t.verifyBody)}</p>`, { label: t.verifyBtn, url }, t.verifyFoot), text: `${t.verifyBody}\n${url}` });
}
export function sendResetMail(to: string, token: string, lang: Lang) {
  const t = T[lang], url = `${env.appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  return sendMail({ to, subject: t.resetSubject, html: layout(t.resetTitle, `<p>${esc(t.resetBody)}</p>`, { label: t.resetBtn, url }, t.resetFoot), text: `${t.resetBody}\n${url}` });
}

/** Boas-vindas, enviadas quando a conta fica pronta para uso (e-mail confirmado ou cadastro pelo Google). Nunca derruba o cadastro: erro só vai para o log. */
export function sendWelcomeMail(to: string, name: string, credits: number, lang: Lang): Promise<boolean> {
  if (!mailEnabled()) return Promise.resolve(false);
  const pt = lang !== "en", first = esc((name || "").split(/[s@]/)[0]);
  const subject = pt ? "Bem-vindo ao Croqui" : "Welcome to Croqui";
  const body = pt
    ? `<p>Oi${first ? ", " + first : ""}! Sua conta está pronta.</p>${credits > 0 ? `<p>Você já tem <b>${credits} créditos</b> para testar.</p>` : ""}<p>Comece por aqui:</p><ul><li>Gere um render a partir do print do seu 3D;</li><li>Monte um moodboard com paleta e materiais;</li><li>Crie o mapa de situação do terreno pelo endereço.</li></ul><p>Qualquer dúvida, é só responder este e-mail.</p>`
    : `<p>Hi${first ? " " + first : ""}! Your account is ready.</p>${credits > 0 ? `<p>You already have <b>${credits} credits</b> to try it out.</p>` : ""}<p>Start here:</p><ul><li>Generate a render from a screenshot of your 3D model;</li><li>Build a moodboard with palette and materials;</li><li>Create the site plan from the address.</li></ul><p>Any question, just reply to this email.</p>`;
  const url = `${env.appUrl}/app`;
  return sendMail({ to, subject, html: layout(pt ? "Bem-vindo ao Croqui" : "Welcome to Croqui", body, { label: pt ? "Abrir o Croqui" : "Open Croqui", url }, pt ? "Você recebeu este e-mail porque criou uma conta no Croqui." : "You received this email because you created a Croqui account."), text: `${pt ? "Bem-vindo ao Croqui!" : "Welcome to Croqui!"}
${url}` }).catch((e) => { console.error("e-mail de boas-vindas falhou:", e?.message); return false; });
}

/** Mensagem do suporte para o e-mail da equipe (SUPPORT_EMAIL). Sem RESEND_API_KEY ou SUPPORT_EMAIL, só fica no banco. */
export async function sendSupportMail(m: { from: string; subject: string; message: string; name?: string }): Promise<boolean> {
  if (!mailEnabled() || !env.supportEmail) {
    console.error(`e-mail de suporte não enviado: ${!mailEnabled() ? "RESEND_API_KEY ausente" : "SUPPORT_EMAIL ausente"} no servidor (a mensagem ficou salva no painel de administração)`);
    return false;
  }
  return sendMail({
    to: env.supportEmail, replyTo: m.from, subject: `[Croqui suporte] ${m.subject}`,
    html: `<p><b>De:</b> ${esc(m.name || "")} &lt;${esc(m.from)}&gt;</p><p style="white-space:pre-wrap">${esc(m.message)}</p>`,
  });
}
