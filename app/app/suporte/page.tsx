import Link from "next/link";
import SupportForm from "@/components/SupportForm";
import { currentUser } from "@/lib/auth";
import { rulesOf } from "@/lib/plans";
import { env } from "@/lib/config";
import { getT } from "@/lib/i18n-server";


export default async function Suporte() {
  const { t } = await getT();
  const u = await currentUser();
  const wa = u && rulesOf(u).suportePrioritario ? env.supportWhatsapp : "";
  return (
    <>
      <h1>{t("Suporte")}</h1>
      <p className="muted">{t("Descreva o seu problema e vamos ajudar você a encontrar uma solução.")} <Link href="/app/ajuda">{t("Ver a Ajuda")}</Link></p>
      {wa && <div className="card"><b>{t("Suporte prioritário por WhatsApp")}</b><p className="small muted" style={{ margin: "6px 0 10px" }}>{t("Seu plano Max tem atendimento prioritário. Fale direto com a gente:")}</p><a className="chip on" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">{t("Chamar no WhatsApp")}</a></div>}
      <SupportForm />
    </>
  );
}
