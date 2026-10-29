import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { mockGemini, mockMaps } from "@/lib/config";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  return (
    <div className="shell">
      <Sidebar name={u.name} credits={u.credits} />
      <div className="main">
        <div className="wrap">
          {(mockGemini() || mockMaps()) && (
            <p className="warn" style={{ marginBottom: 18 }}>Modo de teste (mock): {mockGemini() && "sem GEMINI_API_KEY"}{mockGemini() && mockMaps() && " e "}{mockMaps() && "sem GOOGLE_MAPS_API_KEY"}. Os resultados são exemplos, não IA real.</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
