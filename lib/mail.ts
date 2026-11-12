import { env } from "./config";
import type { Lang } from "./i18n";

/**
 * Envio de e-mail pela API do Resend (https://resend.com), sem SDK. Precisa de RESEND_API_KEY e, para sair de um domínio
 * próprio, MAIL_FROM (ex.: "ArqIA <contato@seudominio.com.br>") com o domínio verificado no Resend.
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
    body: JSON.stringify({ from: process.env.MAIL_FROM || "ArqIA <onboarding@resend.dev>", to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
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
    verifySubject: "Confirme seu e-mail no ArqIA", verifyTitle: "Confirme seu e-mail", verifyBody: "Falta só um passo: confirme que este e-mail é seu para liberar as gerações e os créditos de boas-vindas.", verifyBtn: "Confirmar e-mail", verifyFoot: "O link vale por 48 horas. Se você não criou uma conta no ArqIA, ignore este e-mail.",
    resetSubject: "Redefinir sua senha do ArqIA", resetTitle: "Redefinir senha", resetBody: "Recebemos um pedido para redefinir a senha da sua conta. Se foi você, use o botão abaixo.", resetBtn: "Criar nova senha", resetFoot: "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
  },
  en: {
    verifySubject: "Confirm your email on ArqIA", verifyTitle: "Confirm your email", verifyBody: "One last step: confirm this email is yours to unlock generations and your welcome credits.", verifyBtn: "Confirm email", verifyFoot: "The link is valid for 48 hours. If you didn't create an ArqIA account, ignore this email.",
    resetSubject: "Reset your ArqIA password", resetTitle: "Reset password", resetBody: "We received a request to reset your account password. If it was you, use the button below.", resetBtn: "Create new password", resetFoot: "The link is valid for 1 hour and can be used once. If it wasn't you, ignore this email: your password stays the same.",
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

/** Mensagem do suporte para o e-mail da equipe (SUPPORT_EMAIL). Sem RESEND_API_KEY ou SUPPORT_EMAIL, só fica no banco. */
export async function sendSupportMail(m: { from: string; subject: string; message: string; name?: string }): Promise<boolean> {
  if (!mailEnabled() || !env.supportEmail) return false;
  return sendMail({
    to: env.supportEmail, replyTo: m.from, subject: `[ArqIA suporte] ${m.subject}`,
    html: `<p><b>De:</b> ${esc(m.name || "")} &lt;${esc(m.from)}&gt;</p><p style="white-space:pre-wrap">${esc(m.message)}</p>`,
  });
}
