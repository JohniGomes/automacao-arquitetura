import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/auth";
import { normalizar } from "@/lib/cupom";
import { planById } from "@/lib/plans";
import { store } from "@/lib/store";

export const runtime = "nodejs";
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

/** Cria ou atualiza um cupom (só administradores). Para desativar, envie o mesmo código com ativo=false. */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!isAdmin(u)) return bad("Não encontrado.", 404);
  const b = await req.json().catch(() => ({}));
  const code = normalizar(String(b.code || ""));
  if (!/^[a-z0-9_-]{3,30}$/.test(code)) return bad("O código precisa ter de 3 a 30 letras, números, hífen ou sublinhado, sem espaços nem acentos.");
  const antigo = await store.getCoupon(code).catch(() => null);
  const tipo = b.tipo === "percentual" || b.tipo === "valor" ? b.tipo : "acesso";
  const desconto = tipo === "acesso" ? 0 : Math.round(Number(String(b.desconto).replace(",", ".")) * 100) / 100;
  if (tipo === "percentual" && !(desconto > 0 && desconto <= 100)) return bad("O desconto em % precisa estar entre 1 e 100.");
  if (tipo === "valor" && !(desconto > 0 && desconto < 1000)) return bad("O desconto em R$ precisa ser maior que zero.");
  // cupom de desconto só abate o primeiro mês da assinatura: não leva créditos nem dias de plano
  const creditos = tipo === "acesso" ? Math.round(Number(b.creditos)) : 0;
  const dias = tipo === "acesso" ? Math.round(Number(b.dias)) : 1;
  const limite = b.limite === "" || b.limite == null ? null : Math.round(Number(b.limite));
  if (!Number.isFinite(creditos) || creditos < 0 || creditos > 100000) return bad("Créditos inválidos.");
  if (!Number.isFinite(dias) || dias < 1 || dias > 365) return bad("Os dias precisam estar entre 1 e 365.");
  if (limite != null && (!Number.isFinite(limite) || limite < 1)) return bad("O limite de contas precisa ser 1 ou mais (ou fique em branco para sem limite).");
  const plano = planById(String(b.plano || "max"))?.id ?? "max";
  let validoAte: string | null = null;
  if (b.validoAte) {
    const d = new Date(`${String(b.validoAte).slice(0, 10)}T23:59:59`);
    if (isNaN(d.getTime())) return bad("Data inválida.");
    validoAte = d.toISOString();
  }
  try {
    await store.saveCoupon({ tipo, desconto, code, creditos, dias, plano, limite, validoAte, ativo: b.ativo !== false, createdAt: antigo?.createdAt ?? new Date().toISOString() });
  } catch (e: any) {
    console.error("saveCoupon:", e?.message);
    return bad(String(e?.message || "").startsWith("Os cupons") ? e.message : "Não foi possível salvar agora.", 500);
  }
  return NextResponse.json({ ok: true });
}
