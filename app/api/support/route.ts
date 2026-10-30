import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";

const SUBJECTS = ["duvida", "problema", "cobranca", "sugestao"];
const sent = new Map<string, number[]>();

/** Mensagem para o suporte. Fica salva no banco (tabela support_messages / data/db.json). */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const subject = SUBJECTS.includes(b.subject) ? b.subject : "duvida";
  const message = String(b.message || "").trim().slice(0, 4000);
  if (message.length < 10) return NextResponse.json({ error: "Escreva uma mensagem com pelo menos 10 caracteres." }, { status: 400 });
  // limite simples: 5 mensagens por hora por conta
  const now = Date.now();
  const recent = (sent.get(u.id) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= 5) return NextResponse.json({ error: "Muitas mensagens em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
  try {
    await store.addSupport({ userId: u.id, email: u.email, subject, message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Não foi possível enviar." }, { status: 500 });
  }
  sent.set(u.id, [...recent, now]);
  return NextResponse.json({ ok: true });
}
