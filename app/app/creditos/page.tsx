import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { PACOTES, PLANOS } from "@/lib/costs";
import BuyButton from "./BuyButton";

export const dynamic = "force-dynamic";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function Creditos() {
  const u = (await currentUser())!;
  const txs = await store.listTxs(u.id, 30);
  return (
    <>
      <h1>Créditos e planos</h1>
      <div className="card"><h2>Saldo: {u.credits} créditos</h2></div>
      <div className="card"><h2>Planos</h2>
        <p className="warn">Cobrança ainda não integrada (Stripe / Mercado Pago / Pix a preparar). Nenhum valor é cobrado por enquanto.</p>
        <div className="tools">{PLANOS.map((p) => (
          <div key={p.id} className="card">
            <h2>{p.nome}{p.destaque ? " · mais escolhido" : ""}</h2>
            <p><b>{brl(p.preco)}</b>/mês · {p.creditosMes.toLocaleString("pt-BR")} créditos por mês</p>
            <p className="small muted">Anual: {brl(p.anual)} (créditos liberados mês a mês)</p>
            <ul className="small">{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
            <BuyButton id={p.id} />
          </div>
        ))}</div>
        <p className="small muted">Os créditos do mês não acumulam além de 1 mês de saldo. O filme do projeto (65 créditos por cena) fica disponível para quem tem plano ou já comprou créditos.</p>
      </div>
      <div className="card"><h2>Créditos avulsos</h2>
        <div className="tools">{PACOTES.map((p) => <div key={p.id} className="card"><h2>{p.rotulo}</h2><p>{p.creditos} créditos · <b>{brl(p.preco)}</b></p><BuyButton id={p.id} /></div>)}</div></div>
      <div className="card"><h2>Extrato</h2>
        {txs.map((t) => <div key={t.id} className="row"><span>{t.reason}</span><span className={t.delta < 0 ? "err" : ""}>{t.delta > 0 ? "+" : ""}{t.delta}</span></div>)}</div>
    </>
  );
}
