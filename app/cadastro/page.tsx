import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import LineLoader from "@/components/LineLoader";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await currentUser()) redirect("/app");
  const { erro } = await searchParams;
  const { t } = await getT();
  return (
    <main className="auth">
      <div className="formside"><AuthForm mode="register" erro={erro} /></div>
      <div className="view"><div className="panel" aria-hidden="true"><LineLoader size={220} /><p>{t("do croqui ao render")}</p></div></div>
    </main>
  );
}
