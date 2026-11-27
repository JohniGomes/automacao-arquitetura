import { redirect } from "next/navigation";
import Numero from "@/components/anim/Numero";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { COSTS, PACOTES, PLANOS } from "@/lib/costs";
import { activePlan, precoPacote, rulesOf } from "@/lib/plans";
import { billingEnabled } from "@/lib/billing";
import { getLang, getT } from "@/lib/i18n-server";
import BuyButton from "./BuyButton";
import CancelPlan from "./CancelPlan";
import PlanPicker from "./PlanPicker";
import CupomCode from "./CupomCode";
import { jaUsouCupom, testePadrao } from "@/lib/cupom";

export const dynamic = "force-dynamic";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default async function Creditos({ searchParams }: { searchParams: Promise<{ pagamento?: string; codigo?: string }> }) {
  const { t } = await getT();
  const lang = await getLang();
  const { pagamento, codigo } = await searchParams;
  const u = await currentUser();
  if (!u) redirect("/login");
  const txs = await store.listTxs(u.id, 30);
  const plan = activePlan(u);
  const desconto = rulesOf(u).descontoPacotes;
  const enabled = billingEnabled();
  const mostrarCupom = !plan && !(await jaUsouCupom(u.id));
  const planoDeCupom = !!plan && !u.asaasSubscriptionId;
  const teste = !plan ? await testePadrao(u) : null;
  const until = u.planUntil ? new Date(u.planUntil).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR") : "";
  return (
    <>
      <h1>{t("Créditos e planos")}</h1>
      {pagamento === "ok" && <p className="warn" role="status">{t("Pagamento enviado. Os créditos aparecem aqui assim que o pagamento for confirmado (Pix e cartão costumam levar segundos).")}</p>}
      <div className="card"><div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}><div style={{ minWidth: 0 }}><h2>{t("Saldo")}: <Numero valor={u.credits} duracao={1.2} /> {t("créditos")}</h2>
        {plan ? (
          <p className="small muted" style={{ margin: "6px 0 0" }}>
            {t("Plano")} <b>{t(plan.nome)}</b> ({t("mensal")}) · {u.planStatus === "cancelado" ? t("renovação cancelada, vale até") : t("válido até")} {until}
          </p>
        ) : <p className="small muted" style={{ margin: "6px 0 0" }}>{t("Você ainda não tem um plano.")}</p>}
        {planoDeCupom && <p className="small" style={{ margin: "6px 0 0" }}>{t("Os créditos do cupom expiram junto com o plano. Para continuar, assine um plano.")}</p>}
        {plan && u.planStatus !== "cancelado" && u.planNext && PLANOS.find((p) => p.id === u.planNext) && (
          <p className="small" style={{ margin: "6px 0 0" }}>{t("Troca agendada: na próxima renovação você passa para o plano")} <b>{t(PLANOS.find((p) => p.id === u.planNext)!.nome)}</b>.</p>
        )}
        {plan && u.planStatus !== "cancelado" && <CancelPlan />}
      </div>{plan && u.planStatus !== "cancelado" && <span className="carimbo" aria-hidden="true">{t("Plano")}<br />{t("ativo")}</span>}</div></div>
      {!plan && (
        <div className="card"><h2>{teste ? `${t("Comece com")} ${teste.dias} ${t("dias grátis")}` : t("Escolha um plano para usar o Croqui")}</h2>
          <p className="small">{teste ? `${t("Escolha seu plano, cadastre o cartão e use por")} ${teste.dias} ${t("dias com")} ${teste.creditos} ${t("créditos. A primeira cobrança só acontece depois do período grátis, e quem cancela antes não paga nada.")}` : t("Para gerar imagens, assine um plano abaixo.")}</p></div>
      )}
      {mostrarCupom && <CupomCode inicial={codigo} />}
      <div className="card"><h2>{t("Planos")}</h2>
        {!enabled && <p className="warn">{t("A cobrança online ainda não está ativa. Fale com o suporte para contratar.")}</p>}
        <PlanPicker plans={PLANOS.map((p) => ({ ...p }))} enabled={enabled} current={plan?.id} trialDias={teste?.dias ?? 0} />
        <p className="small muted">{t("Créditos não cumulativos")}</p>
      </div>
      <div className="card"><h2>{t("Créditos avulsos")}</h2>
        <div className="tools">{PACOTES.map((p) => (
          <div key={p.id} className="card"><h2>{t(p.rotulo)}</h2><p>{p.creditos} {t("créditos")} · <b>{brl(precoPacote(p.preco, u))}</b>{desconto > 0 && <> <s className="muted">{brl(p.preco)}</s></>}</p>{desconto > 0 && <p className="small muted" style={{ margin: "0 0 8px" }}>{t("{n}% de desconto do seu plano", { n: desconto })}</p>}
            {enabled ? <BuyButton id={p.id} label="Comprar" t={t} /> : <button type="button" disabled>{t("Em breve")}</button>}</div>
        ))}</div></div>
      <div className="card"><h2>{t("Extrato")}</h2>
        {txs.map((x) => <div key={x.id} className="row"><span>{t(x.reason)}</span><span className={x.delta < 0 ? "err" : ""}>{x.delta > 0 ? "+" : ""}{x.delta}</span></div>)}</div>
    </>
  );
}
