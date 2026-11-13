import { currentUser } from "@/lib/auth";
import { activePlan } from "@/lib/plans";
import { getLang, getT, getTheme } from "@/lib/i18n-server";
import AccountView from "@/components/AccountView";

export const dynamic = "force-dynamic";

export default async function Conta() {
  const { t } = await getT();
  const lang = await getLang();
  const u = (await currentUser())!;
  const plan = activePlan(u);
  const until = u.planUntil ? new Date(u.planUntil).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR") : "";
  const planLine = plan
    ? `${t("Plano")} ${t(plan.nome)} · ${u.planStatus === "cancelado" ? t("renovação cancelada, vale até") : t("válido até")} ${until}`
    : t("Você ainda não tem um plano.");
  return (
    <>
      <h1>{t("Conta")}</h1>
      <AccountView name={u.name} email={u.email} credits={u.credits} planLine={planLine} theme={await getTheme()} />
    </>
  );
}
