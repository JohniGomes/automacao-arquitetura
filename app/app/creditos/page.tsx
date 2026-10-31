import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { PACOTES, PLANOS } from "@/lib/costs";
import { activePlan } from "@/lib/plans";
import { billingEnabled } from "@/lib/billing";
import { getLang, getT } from "@/lib/i18n-server";
import BuyButton from "./BuyButton";
import CancelPlan from "./CancelPlan";
import PlanPicker from "./PlanPicker";

export const dynamic = "force-dynamic";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function Creditos({ searchParams }: { searchParams: Promise<{ pagamento?: string }> }) {
  const { t } = await getT();
  const lang = await getLang();
  const { pagamento } = await searchParams;
  const u = (await currentUser())!;
  const txs = await store.listTxs(u.id, 30);
  const plan = activePlan(u);
  const enabled = billingEnabled();
  const needsCpf = !u.asaasCustomerId;
  const until = u.planUntil ? new Date(u.planUntil).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR") : "";
  return (
    <>
      <h1>{t("Créditos e planos")}</h1>
      {pagamento === "ok" && <p className="warn" role="status">{t("Pagamento enviado. Os créditos aparecem aqui assim que o pagamento for confirmado (Pix costuma levar segundos; boleto, até 2 dias úteis).")}</p>}
      <div className="card"><h2>{t("Saldo")}: {u.credits} {t("créditos")}</h2>
        {plan ? (
          <p className="small muted" style={{ margin: "6px 0 0" }}>
            {t("Plano")} <b>{t(plan.nome)}</b> ({t("mensal")}) · {u.planStatus === "cancelado" ? t("renovação cancelada, vale até") : t("válido até")} {until}
          </p>
        ) : <p className="small muted" style={{ margin: "6px 0 0" }}>{t("Você ainda não tem um plano.")}</p>}
        {plan && u.planStatus !== "cancelado" && <CancelPlan />}
      </div>
      <div className="card"><h2>{t("Planos")}</h2>
        {!enabled && <p className="warn">{t("A cobrança online ainda não está ativa. Fale com o suporte para contratar.")}</p>}
        <PlanPicker plans={PLANOS.map((p) => ({ ...p }))} enabled={enabled} current={plan?.id} needsCpf={needsCpf} />
        <p className="small muted">{t("Os créditos do mês não acumulam além de 1 mês de saldo. O filme do projeto (65 créditos por cena) fica disponível para quem tem plano ou já comprou créditos.")} {t("Pagamento por Pix, boleto ou cartão, processado pelo Asaas.")}</p>
      </div>
      <div className="card"><h2>{t("Créditos avulsos")}</h2>
        <div className="tools">{PACOTES.map((p) => (
          <div key={p.id} className="card"><h2>{t(p.rotulo)}</h2><p>{p.creditos} {t("créditos")} · <b>{brl(p.preco)}</b></p>
            {enabled ? <BuyButton id={p.id} needsCpf={needsCpf} /> : <button type="button" disabled>{t("Em breve")}</button>}</div>
        ))}</div></div>
      <div className="card"><h2>{t("Extrato")}</h2>
        {txs.map((x) => <div key={x.id} className="row"><span>{t(x.reason)}</span><span className={x.delta < 0 ? "err" : ""}>{x.delta > 0 ? "+" : ""}{x.delta}</span></div>)}</div>
    </>
  );
}
