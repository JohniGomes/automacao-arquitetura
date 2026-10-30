import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { PACOTES, PLANOS } from "@/lib/costs";
import BuyButton from "./BuyButton";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function Creditos() {
  const { t } = await getT();
  const u = (await currentUser())!;
  const txs = await store.listTxs(u.id, 30);
  return (
    <>
      <h1>{t("Créditos e planos")}</h1>
      <div className="card"><h2>{t("Saldo")}: {u.credits} {t("créditos")}</h2></div>
      <div className="card"><h2>{t("Planos")}</h2>
        <p className="warn">{t("Cobrança ainda não integrada (Stripe / Mercado Pago / Pix a preparar). Nenhum valor é cobrado por enquanto.")}</p>
        <div className="tools">{PLANOS.map((p) => (
          <div key={p.id} className="card">
            <h2>{t(p.nome)}{p.destaque ? ` · ${t("mais escolhido")}` : ""}</h2>
            <p><b>{brl(p.preco)}</b>/{t("mês")} · {p.creditosMes.toLocaleString("pt-BR")} {t("créditos por mês")}</p>
            <p className="small muted">{t("Anual")}: {brl(p.anual)} ({t("créditos liberados mês a mês")})</p>
            <ul className="small">{p.itens.map((i) => <li key={i}>{t(i)}</li>)}</ul>
            <BuyButton id={p.id} />
          </div>
        ))}</div>
        <p className="small muted">{t("Os créditos do mês não acumulam além de 1 mês de saldo. O filme do projeto (65 créditos por cena) fica disponível para quem tem plano ou já comprou créditos.")}</p>
      </div>
      <div className="card"><h2>{t("Créditos avulsos")}</h2>
        <div className="tools">{PACOTES.map((p) => <div key={p.id} className="card"><h2>{t(p.rotulo)}</h2><p>{p.creditos} {t("créditos")} · <b>{brl(p.preco)}</b></p><BuyButton id={p.id} /></div>)}</div></div>
      <div className="card"><h2>{t("Extrato")}</h2>
        {txs.map((x) => <div key={x.id} className="row"><span>{t(x.reason)}</span><span className={x.delta < 0 ? "err" : ""}>{x.delta > 0 ? "+" : ""}{x.delta}</span></div>)}</div>
    </>
  );
}
