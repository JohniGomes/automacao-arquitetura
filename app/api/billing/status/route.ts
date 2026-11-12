import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { paymentPaid } from "@/lib/billing";

/** A tela de pagamento pergunta aqui se o Pix/cartão já foi confirmado (os créditos entram pelo webhook). */
export async function GET(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("paymentId") || "";
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) return NextResponse.json({ paid: false });
  return NextResponse.json({ paid: await paymentPaid(u.id, id) }, { headers: { "Cache-Control": "no-store" } });
}
