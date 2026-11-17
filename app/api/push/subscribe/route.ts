import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { limited } from "@/lib/ratelimit";
import { pushAtivo } from "@/lib/push";
import { store } from "@/lib/store";

export const runtime = "nodejs";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Registra (POST) ou remove (DELETE) a inscrição de notificações deste aparelho. */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  if (!pushAtivo()) return bad("As notificações ainda não estão ativas neste servidor.", 503);
  if (await limited(`push:${u.id}`, 30, 10 * 60_000)) return bad("Muitas tentativas. Aguarde um pouco.", 429);
  const j = await req.json().catch(() => null);
  const endpoint = String(j?.endpoint || ""), p256dh = String(j?.keys?.p256dh || ""), auth = String(j?.keys?.auth || "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) return bad("Inscrição inválida.");
  try {
    await store.addPush({ endpoint, userId: u.id, p256dh, auth, createdAt: new Date().toISOString() });
  } catch (e: any) {
    console.error("addPush:", e?.message);
    return bad(String(e?.message || "").startsWith("As notificações") ? e.message : "Não foi possível ativar agora.", 500);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const u = await currentUser();
  if (!u) return bad("Não autenticado.", 401);
  const j = await req.json().catch(() => null);
  const endpoint = String(j?.endpoint || "");
  // só apaga inscrição que pertence ao próprio usuário
  const minhas = await store.listPushes(u.id);
  if (minhas.some((s) => s.endpoint === endpoint)) await store.removePush(endpoint);
  return NextResponse.json({ ok: true });
}
