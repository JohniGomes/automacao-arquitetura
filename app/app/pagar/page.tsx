import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { billingEnabled, changeQuote } from "@/lib/billing";
import { PACOTES, PLANOS } from "@/lib/costs";
import { activePlan, precoPacote } from "@/lib/plans";
import { testePadrao } from "@/lib/cupom";
import { getT } from "@/lib/i18n-server";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

/** Tela de pagamento do app: Pix (créditos avulsos) ou cartão (créditos avulsos e planos). */
export default async function Pagar({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  const u = await currentUser();
  if (!u) redirect("/login");
  const pack = PACOTES.find((p) => p.id === item);
  const plan = pack ? null : PLANOS.find((p) => p.id === item);
  if ((!pack && !plan) || !billingEnabled()) redirect("/app/creditos");
  const { t, lang } = await getT();
  // quem já tem plano ativo troca de plano: upgrade cobra a diferença proporcional, downgrade vale na renovação
  const switching = !!plan && !!activePlan(u) && u.planStatus !== "cancelado" && !!u.asaasSubscriptionId;
  const q = switching ? await changeQuote(u, plan!.id).catch(() => null) : null;
  const teste = plan && !switching ? await testePadrao(u) : null;
  const blocked = switching && !q ? t("Este já é o seu plano atual.") : "";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR");
  return (
    <CheckoutForm
      itemId={(pack?.id || plan!.id)}
      isPlan={!!plan}
      title={pack ? `${pack.creditos} ${t("créditos")} · ${t(pack.rotulo)}` : `${t("Plano")} ${t(plan!.nome)}`}
      price={pack ? precoPacote(pack.preco, u) : plan!.preco}
      detail={pack ? "" : `${plan!.creditosMes} ${t("créditos por mês")}`}
      needsDoc={!u.asaasCustomerId}
      blocked={blocked}
      trialDias={teste?.dias ?? 0}
      trialCreditos={teste?.creditos ?? 0}
      change={q ? { mode: q.mode, amount: q.amount, extraCredits: q.extraCredits, nextDue: fmt(q.nextDue), newPrice: q.newPrice } : undefined}
    />
  );
}
