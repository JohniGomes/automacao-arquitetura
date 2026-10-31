import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { sendSupportMail } from "@/lib/mail";
import { limited } from "@/lib/ratelimit";
import { rulesOf } from "@/lib/plans";

const SUBJECTS: Record<string, string> = { duvida: "Dúvida", problema: "Problema técnico", cobranca: "Cobrança e planos", sugestao: "Sugestão" };

/** Mensagem para o suporte: fica salva no banco e, com RESEND_API_KEY + SUPPORT_EMAIL, também chega por e-mail. */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const subject = b.subject in SUBJECTS ? String(b.subject) : "duvida";
  const message = String(b.message || "").trim().slice(0, 4000);
  if (message.length < 10) return NextResponse.json({ error: "Escreva uma mensagem com pelo menos 10 caracteres." }, { status: 400 });
  if (limited(`support:${u.id}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Muitas mensagens em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
  try {
    await store.addSupport({ userId: u.id, email: u.email, subject, message });
  } catch (e: any) {
    console.error("support:", e?.message);
    return NextResponse.json({ error: "Não foi possível enviar." }, { status: 500 });
  }
  // o e-mail é um aviso extra: se falhar, a mensagem já está salva
  void sendSupportMail({ from: u.email, name: u.name, subject: `${rulesOf(u).suportePrioritario ? "PRIORITÁRIO · " : ""}${SUBJECTS[subject]}`, message }).catch((e) => console.error("e-mail de suporte falhou:", e?.message));
  return NextResponse.json({ ok: true });
}
