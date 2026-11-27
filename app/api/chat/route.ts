import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { describeProject } from "@/lib/ai";
import { mockGemini } from "@/lib/config";
import { getLang } from "@/lib/i18n-server";
import { limited } from "@/lib/ratelimit";
import { activePlan } from "@/lib/plans";
import { promptChat, respostaMock } from "@/lib/chatKnowledge";

export const runtime = "nodejs";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Mensagens por dia e por minuto de cada pessoa: o chat é grátis, mas custa centavos por pergunta. */
const POR_DIA = 30;
const POR_MINUTO = 8;
const MAX_CHARS = 500;
const MAX_HISTORICO = 8;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  if (await limited(`chatb:${u.id}`, POR_MINUTO, 60_000)) return bad("Calma, são muitas mensagens em pouco tempo. Espere um minuto e tente de novo.", 429);
  if (await limited(`chat:${u.id}`, POR_DIA, 24 * 3600_000)) return bad(`Você usou as ${POR_DIA} mensagens de hoje. Volte amanhã ou fale com a equipe em Suporte.`, 429);

  const b = await req.json().catch(() => null);
  const bruto: unknown[] = Array.isArray(b?.messages) ? b.messages : [];
  const msgs: Msg[] = bruto
    .map((m: any): Msg => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "").trim().slice(0, MAX_CHARS) }))
    .filter((m) => m.content)
    .slice(-MAX_HISTORICO);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return bad("Escreva uma pergunta.");

  const lang = await getLang();
  const ctx = { nome: (u.name || "").split(" ")[0].slice(0, 30), plano: activePlan(u)?.nome ?? "", creditos: u.credits };
  try {
    if (mockGemini()) return NextResponse.json({ reply: respostaMock(msgs[msgs.length - 1].content) });
    const reply = (await describeProject(promptChat(ctx, lang === "en" ? "en" : "pt", msgs), [])).trim().slice(0, 1500);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("chat falhou:", (e as Error)?.message);
    return bad("Não consegui responder agora. Tente de novo em instantes.", 502);
  }
}
