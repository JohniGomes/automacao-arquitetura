"use client";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Seg } from "@/components/controls";
import BuyButton from "./BuyButton";

export type PlanCard = { id: string; nome: string; preco: number; anual: number; creditosMes: number; destaque: boolean; itens: readonly string[] };
const brl = (n: number, frac = 0) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: frac, maximumFractionDigits: frac });

/** Escolha entre mensal e anual e botão de contratar de cada plano. */
export default function PlanPicker({ plans, enabled, current }: { plans: PlanCard[]; enabled: boolean; current?: string }) {
  const t = useT();
  const [interval, setInterval] = useState<"mensal" | "anual">("mensal");
  return (
    <>
      <Seg label="Cobrança" value={interval} onChange={setInterval} options={[{ v: "mensal", label: "Mensal" }, { v: "anual", label: "Anual", desc: "2 meses grátis: o plano anual é pago uma vez e libera os créditos mês a mês." }]} />
      <div className="tools">
        {plans.map((p) => (
          <div key={p.id} className={`card plancard ${p.destaque ? "feat" : ""}`}>
            <h2>{t(p.nome)}{p.destaque ? ` · ${t("mais escolhido")}` : ""}</h2>
            <p className="price"><b>{interval === "anual" ? brl(p.anual) : brl(p.preco)}</b><span>/{interval === "anual" ? t("ano") : t("mês")}</span></p>
            {interval === "anual" && <p className="small muted">{t("equivale a")} {brl(p.anual / 12, 2)}/{t("mês")}</p>}
            <p className="small">{p.creditosMes.toLocaleString("pt-BR")} {t("créditos por mês")}</p>
            <ul className="small">{p.itens.map((i) => <li key={i}>{t(i)}</li>)}</ul>
            {current === p.id ? <p className="tag done">{t("Seu plano atual")}</p>
              : enabled ? <BuyButton id={p.id} interval={interval} label={current ? "Trocar para este plano" : "Assinar"} />
              : <button type="button" disabled>{t("Em breve")}</button>}
          </div>
        ))}
      </div>
    </>
  );
}
