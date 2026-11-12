import { getT } from "@/lib/i18n-server";

/** Esqueleto mostrado enquanto uma tela do app carrega. */
export default async function Loading() {
  const { t } = await getT();
  return (
    <div role="status" aria-busy="true" aria-label={t("Carregando")}>
      <span className="skel title" />
      <div className="skel-card"><span className="skel line w40" /><span className="skel block" /></div>
      <div className="skel-card"><span className="skel line w60" /><span className="skel line" /><span className="skel line w40" /></div>
    </div>
  );
}
