import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getTheme } from "@/lib/i18n-server";
import Rail from "@/components/Rail";
import MobileTop from "@/components/MobileTop";
import Onboarding from "@/components/Onboarding";
import ChatCro from "@/components/ChatCro";
import AvisoCreditos from "@/components/AvisoCreditos";
import { limiteBaixo } from "@/lib/saldo";
import Faiscas from "@/components/anim/Faiscas";
import PageTransition from "@/components/anim/PageTransition";
import { activePlan } from "@/lib/plans";
import { PLANOS } from "@/lib/costs";
import { billingEnabled } from "@/lib/billing";
import { testePadrao } from "@/lib/cupom";
import VerifyBanner from "@/components/VerifyBanner";
import { needsVerification } from "@/lib/verify";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const semPlano = !activePlan(u);
  const limite = limiteBaixo(activePlan(u)?.creditosMes);
  const teste = semPlano ? await testePadrao(u) : null;
  return (
    <div className="shell">
      <Rail name={u.name} credits={u.credits} theme={await getTheme()} />
      {semPlano && <Onboarding nome={u.name || u.email} plans={PLANOS.map((p) => ({ id: p.id, nome: p.nome, preco: p.preco, creditosMes: p.creditosMes, destaque: p.destaque, itens: p.itens }))} trialDias={teste?.dias ?? 0} trialCreditos={teste?.creditos ?? 0} needsDoc={!u.asaasCustomerId} billingOn={billingEnabled()} />}
      <ChatCro nome={u.name || u.email} creditos={u.credits} limite={limite} />
      <div className="main">
        <MobileTop name={u.name || u.email} credits={u.credits} />
        <div className="wrap">
          {needsVerification(u) && <VerifyBanner email={u.email} />}
          <AvisoCreditos creditos={u.credits} limite={limite} />
          <Faiscas><PageTransition>{children}</PageTransition></Faiscas>
        </div>
      </div>
    </div>
  );
}
