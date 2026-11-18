"use client";
import { useT } from "@/components/I18nProvider";
import BuyButton from "./BuyButton";

export type PlanCard = { id: string; nome: string; preco: number; creditosMes: number; destaque: boolean; itens: readonly string[] };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

/** Os planos (todos mensais) e o botão de assinar de cada um. */
export default function PlanPicker({ plans, enabled, current, trialDias = 0 }: { plans: PlanCard[]; enabled: boolean; current?: string; trialDias?: number }) {
  const t = useT();
  return (
    <div className="tools">
      {plans.map((p) => (
        <div key={p.id} className={`card plancard ${p.destaque ? "feat" : ""}`}>
          <h2>{t(p.nome)}{p.destaque ? ` · ${t("mais escolhido")}` : ""}</h2>
          <p className="price"><b>{brl(p.preco)}</b><span>/{t("mês")}</span></p>
          <p className="small">{p.creditosMes.toLocaleString("pt-BR")} {t("créditos por mês")}</p>
          <ul className="small">{p.itens.map((i) => <li key={i}>{t(i)}</li>)}</ul>
          {current === p.id ? <p className="tag done">{t("Seu plano atual")}</p>
            : enabled ? <BuyButton id={p.id} label={current ? "Trocar para este plano" : trialDias > 0 ? "Começar teste grátis" : "Assinar"} t={t} />
            : <button type="button" disabled>{t("Em breve")}</button>}
        </div>
      ))}
    </div>
  );
}
