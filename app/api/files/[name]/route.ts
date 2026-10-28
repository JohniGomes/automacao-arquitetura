import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4" };

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const u = await currentUser();
  if (!u) return new NextResponse("Não autenticado", { status: 401 });
  const { name } = await params;
  const buf = readFile(u.id, name);
  if (!buf) return new NextResponse("Não encontrado", { status: 404 });
  const dl = new URL(req.url).searchParams.get("dl");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPES[name.split(".").pop() || ""] || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      ...(dl ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
