import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { satellite } from "@/lib/maps";
import { mockMaps } from "@/lib/config";
import { limited } from "@/lib/ratelimit";

/** Pré-visualização do satélite (a chave do Maps fica no servidor). Cada chamada é cobrada pelo Google, então tem limite por usuário. */
export async function GET(req: NextRequest) {
  const u = await currentUser();
  if (!u) return new NextResponse("Não autenticado", { status: 401 });
  if (limited(`maps:${u.id}`, 30, 10 * 60_000)) return new NextResponse("Muitas pré-visualizações. Aguarde alguns minutos.", { status: 429 });
  const address = req.nextUrl.searchParams.get("address")?.trim().slice(0, 200);
  if (!address) return new NextResponse("Informe o endereço", { status: 400 });
  try {
    const buf = await satellite(address, Number(req.nextUrl.searchParams.get("zoom")) || 18);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": mockMaps() ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=600" } });
  } catch (e: any) {
    console.error("maps preview:", e?.message);
    return new NextResponse("Não foi possível carregar o satélite para este endereço.", { status: 502 });
  }
}
