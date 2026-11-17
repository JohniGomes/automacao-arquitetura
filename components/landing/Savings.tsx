"use client";
import { useState } from "react";
import { useT } from "../I18nProvider";
import { COSTS, PACOTES, PLANOS } from "@/lib/costs";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const CREDITOS_POR_RENDER = COSTS.renderPorImagem; // render no modo rápido, uma versão

type Opcao = { custo: number; nome: string; tipo: "plano" | "pacote" | "max+"; qtd?: number };

/** Menor custo mensal que cobre os créditos necessários: plano, pacote avulso ou Max mais avulsos. */
function melhorOpcao(creditos: number): Opcao {
  const opcoes: Opcao[] = [];
  for (const p of PLANOS) if (p.creditosMes >= creditos) opcoes.push({ custo: p.preco, nome: p.nome, tipo: "plano" });
  for (const k of PACOTES) {
    const qtd = Math.ceil(creditos / k.creditos);
    opcoes.push({ custo: qtd * k.preco, nome: k.rotulo, tipo: "pacote", qtd });
  }
  const max = PLANOS[PLANOS.length - 1];
  const melhorPacote = PACOTES[PACOTES.length - 1];
  if (creditos > max.creditosMes) {
    opcoes.push({ custo: max.preco + Math.ceil((creditos - max.creditosMes) / melhorPacote.creditos) * melhorPacote.preco, nome: max.nome, tipo: "max+" });
  }
  return opcoes.sort((a, b) => a.custo - b.custo)[0];
}

/** Calculadora de economia: o usuário informa quantos renders faz e quanto paga por render hoje. */
export default function Savings() {
  const t = useT();
  const [renders, setRenders] = useState(30);
  const [preco, setPreco] = useState(100);
  const hoje = renders * Math.max(0, preco);
  const op = melhorOpcao(renders * CREDITOS_POR_RENDER);
  const economia = hoje - op.custo;
  const nome = op.tipo === "plano"
    ? t("Plano {nome}", { nome: t(op.nome) })
    : op.tipo === "pacote"
      ? t("Pacote {nome}", { nome: `${op.qtd && op.qtd > 1 ? `${op.qtd}× ` : ""}${t(op.nome)}` })
      : t("Plano {nome} e créditos avulsos", { nome: t(op.nome) });

  return (
    <div className="lp-save">
      <div className="lp-savein">
        <div className="lp-fld">
          <div className="lp-fldhead">
            <label htmlFor="sv-r">{t("Renders por mês")}</label>
            <output className="lp-bignum" htmlFor="sv-r">{renders}</output>
          </div>
          <input id="sv-r" className="lp-range" type="range" min={1} max={200} step={1} value={renders} style={{ "--p": `${((renders - 1) / 199) * 100}%` } as React.CSSProperties} onChange={(e) => setRenders(+e.target.value)} />
          <div className="lp-scale" aria-hidden="true"><span>1</span><span>100</span><span>200</span></div>
        </div>
        <div className="lp-fld">
          <label htmlFor="sv-p">{t("Quanto você paga por render hoje")}</label>
          <div className="lp-money">
            <button type="button" className="lp-step" aria-label={t("Diminuir")} onClick={() => setPreco((p) => Math.max(0, p - 10))}>−</button>
            <div className="lp-money-in">
              <span>R$</span>
              <input id="sv-p" type="number" inputMode="numeric" min={0} max={5000} value={preco} onChange={(e) => setPreco(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))} />
            </div>
            <button type="button" className="lp-step" aria-label={t("Aumentar")} onClick={() => setPreco((p) => Math.min(5000, p + 10))}>+</button>
          </div>
          <div className="lp-chips" role="group" aria-label={t("Valores de exemplo")}>
            {[50, 100, 150, 250, 400].map((v) => (
              <button key={v} type="button" className={preco === v ? "on" : ""} aria-pressed={preco === v} onClick={() => setPreco(v)}>R$ {v}</button>
            ))}
          </div>
          <p className="small muted">{t("Valor de exemplo: ajuste ao seu caso.")}</p>
        </div>
      </div>
      <div className="lp-saveout" aria-live="polite">
        <div className="lp-cmp">
          <div><span>{t("Hoje")}</span><b>{brl(hoje)}</b><small>{t("por mês")}</small></div>
          <div className="mine"><span>{t("Com o Croqui")}</span><b>{brl(op.custo)}</b><small>{nome}</small></div>
        </div>
        <p className="lp-big">{economia > 0 ? <>{t("Economia de")} <b>{brl(economia)}</b> {t("por mês")}</> : t("Com esses números, o custo fica parecido.")}</p>
        <p className="small muted">{t("Cálculo com renders no modo rápido ({n} créditos cada) e a opção mais barata que cobre o volume. Não inclui o tempo de retrabalho.", { n: CREDITOS_POR_RENDER })}</p>
      </div>
    </div>
  );
}
