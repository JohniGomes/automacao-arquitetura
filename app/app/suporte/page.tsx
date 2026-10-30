import Link from "next/link";
import SupportForm from "@/components/SupportForm";
import { getT } from "@/lib/i18n-server";


export default async function Suporte() {
  const { t } = await getT();
  return (
    <>
      <h1>{t("Suporte")}</h1>
      <p className="muted">{t("Descreva o seu problema e vamos ajudar você a encontrar uma solução.")} <Link href="/app/ajuda">{t("Ver a Ajuda")}</Link></p>
      <SupportForm />
    </>
  );
}
