import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { geocode } from "@/lib/maps"; import { mockMaps } from "@/lib/config";
import { limited } from "@/lib/ratelimit";

/** Endereço digitado → coordenada e partes do endereço (a chave do Google fica no servidor; cada chamada é cobrada, então tem limite por usuário). */
export async function GET(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (await limited(`geocode:${u.id}`, 40, 10 * 60_000)) return NextResponse.json({ error: "Muitas buscas. Aguarde alguns minutos." }, { status: 429 });
  const address = req.nextUrl.searchParams.get("address")?.trim().slice(0, 200);
  if (!address) return NextResponse.json({ error: "Informe o endereço" }, { status: 400 });
  try {
    const g = await geocode(address);
    if (!g) return NextResponse.json({ error: "Não encontramos esse endereço. Tente incluir a cidade e o estado." }, { status: 404 });
    return NextResponse.json({ ...g, mock: mockMaps() });
  } catch (e: any) {
    console.error("geocode:", e?.message);
    return NextResponse.json({ error: "Não foi possível buscar o endereço agora." }, { status: 502 });
  }
}
