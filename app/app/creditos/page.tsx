import { currentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { COSTS, PACOTES } from "@/lib/costs";
import BuyButton from "./BuyButton";

export const dynamic = "force-dynamic";

export default async function Creditos() {
  const u = (await currentUser())!;
  const txs = await store.listTxs(u.id, 30);
  return (
    <>
      <h1>Créditos</h1>
      <div className="card"><h2>Saldo: {u.credits} créditos</h2>
        <p className="muted">Consumo: mapa {COSTS.mapa} · moodboard {COSTS.moodboard} · render {COSTS.renderPorImagem}/imagem (4 versões = {COSTS.renderPorImagem * 4}) · luz {COSTS.luz} · filme {COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena}/cena. Falhas são estornadas automaticamente.</p></div>
      <div className="card"><h2>Comprar créditos</h2>
        <p className="warn">Cobrança ainda não integrada (Stripe / Mercado Pago / Pix a preparar). Nenhum valor é cobrado e os preços serão definidos depois de medir os custos reais de API.</p>
        <div className="tools">{PACOTES.map((p) => <div key={p.id} className="card"><h2>{p.rotulo}</h2><p>{p.creditos} créditos</p><BuyButton id={p.id} /></div>)}</div></div>
      <div className="card"><h2>Extrato</h2>
        {txs.map((t) => <div key={t.id} className="row"><span>{t.reason}</span><span className={t.delta < 0 ? "err" : ""}>{t.delta > 0 ? "+" : ""}{t.delta}</span></div>)}</div>
    </>
  );
}
