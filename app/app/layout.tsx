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
          <footer className="legal">
            <p><strong>Aviso:</strong> a IA não substitui a responsabilidade técnica do arquiteto. As imagens são ilustrativas; verifique geometria, medidas, normas e direitos de uso antes de entregar a um cliente.</p>
            <p><strong>Google Maps:</strong> imagens de satélite vêm da Google Maps Platform e estão sujeitas aos <a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noreferrer">Termos de Serviço da Google Maps Platform</a> e à atribuição exigida. Confira se o seu uso (inclusive reprocessar a imagem com IA e redistribuí-la) é permitido.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
