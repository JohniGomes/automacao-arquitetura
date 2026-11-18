import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { rulesOf } from "@/lib/plans";
import { store } from "@/lib/store";
import { getT } from "@/lib/i18n-server";
import EscritorioForm from "./EscritorioForm";

export const dynamic = "force-dynamic";

/** Marca do escritório (logo, nome e, no plano Max, responsável técnico e cor), usada nas pranchas do mapa de situação. */
export default async function Escritorio() {
  const { t } = await getT();
  const u = (await currentUser())!;
  const nivel = rulesOf(u).marcaEscritorio;
  const o = nivel === "nenhuma" ? null : await store.getOffice(u.id).catch(() => null);
  return (
    <>
      <h1>{t("Marca do escritório")}</h1>
      {nivel === "nenhuma" ? (
        <div className="card">
          <p>{t("A marca do escritório faz parte do plano Max.")}</p>
          <Link href="/app/creditos" className="chip on">{t("Ver os planos")}</Link>
        </div>
      ) : (
        <EscritorioForm nivel={nivel} inicial={o ? { nome: o.nome, responsavel: o.responsavel, registro: o.registro, cor: o.cor, logo: o.logo } : null} />
      )}
    </>
  );
}
