import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { mockGemini, mockMaps } from "@/lib/config";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u) redirect("/");
  return (
    <>
      <Header name={u.name} credits={u.credits} />
      <div className="wrap">
        {(mockGemini() || mockMaps()) && (
          <p className="warn">Modo de teste (mock): {mockGemini() && "sem GEMINI_API_KEY"}{mockGemini() && mockMaps() && " e "}{mockMaps() && "sem GOOGLE_MAPS_API_KEY"} — resultados são exemplos, não IA real.</p>
        )}
        {children}
        <footer className="legal">
          <p><strong>Aviso:</strong> a IA não substitui a responsabilidade técnica do arquiteto. As imagens são ilustrativas; verifique geometria, medidas, normas e direitos de uso antes de entregar a um cliente.</p>
          <p><strong>Google Maps:</strong> imagens de satélite vêm da Google Maps Platform e estão sujeitas aos <a href="https://cloud.google.com/maps-platform/terms" target="_blank">Termos de Serviço da Google Maps Platform</a> e à atribuição exigida. Confira se o seu uso (inclusive reprocessar a imagem com IA e redistribuí-la) é permitido. <Link href="/app/creditos">Créditos e custos</Link>.</p>
        </footer>
      </div>
    </>
  );
}
