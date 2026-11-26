import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { activePlan } from "@/lib/plans";
import { getLang, getT, getTheme } from "@/lib/i18n-server";
import Link from "next/link";
import AccountView from "@/components/AccountView";
import { rulesOf } from "@/lib/plans";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Conta() {
  const { t } = await getT();
  const lang = await getLang();
  const u = await currentUser();
  if (!u) redirect("/login");
  const plan = activePlan(u);
  const until = u.planUntil ? new Date(u.planUntil).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR") : "";
  const planLine = plan
    ? `${t("Plano")} ${t(plan.nome)} · ${u.planStatus === "cancelado" ? t("renovação cancelada, vale até") : t("válido até")} ${until}`
    : t("Você ainda não tem um plano.");
  return (
    <>
      <h1>{t("Conta")}</h1>
      <AccountView name={u.name} email={u.email} credits={u.credits} planLine={planLine} theme={await getTheme()} admin={isAdmin(u)} />
      <div className="card"><h2>{t("Marca do escritório")}</h2><p className="small muted">{t("Aparece nas pranchas do mapa de situação.")}</p><Link href={rulesOf(u).marcaEscritorio === "nenhuma" ? "/app/creditos" : "/app/escritorio"} className="chip on">{rulesOf(u).marcaEscritorio === "nenhuma" ? t("Ver os planos") : t("Marca do escritório")}</Link></div>
    </>
  );
}
