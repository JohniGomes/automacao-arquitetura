import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { satellite } from "@/lib/maps";
import { mockMaps } from "@/lib/config";

/** Pré-visualização do satélite (a chave do Maps fica no servidor). Cada chamada é cobrada pelo Google. */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return new NextResponse("Não autenticado", { status: 401 });
  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address) return new NextResponse("Informe o endereço", { status: 400 });
  try {
    const buf = await satellite(address, Number(req.nextUrl.searchParams.get("zoom")) || 18);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": mockMaps() ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=600" } });
  } catch (e: any) {
    return new NextResponse(e.message, { status: 502 });
  }
}
