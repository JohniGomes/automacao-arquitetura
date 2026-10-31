import { env } from "./config";

/**
 * Envio de e-mail pela API do Resend (https://resend.com), sem SDK. Só funciona com RESEND_API_KEY e SUPPORT_EMAIL.
 * Sem isso, retorna false e as mensagens ficam só no banco.
 */
export async function sendSupportMail(m: { from: string; subject: string; message: string; name?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !env.supportEmail) return false;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "ArqIA <onboarding@resend.dev>",
      to: [env.supportEmail],
      reply_to: m.from,
      subject: `[ArqIA suporte] ${m.subject}`,
      html: `<p><b>De:</b> ${esc(m.name || "")} &lt;${esc(m.from)}&gt;</p><p style="white-space:pre-wrap">${esc(m.message)}</p>`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return true;
}
