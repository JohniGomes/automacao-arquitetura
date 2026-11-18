"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CheckoutForm from "@/app/app/pagar/CheckoutForm";
import Logo from "./Logo";
import Icon from "./icons";
import { COSTS } from "@/lib/costs";
import { useT } from "./I18nProvider";

export type PlanoOb = { id: string; nome: string; preco: number; creditosMes: number; destaque: boolean; itens: readonly string[] };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
/** Telas que continuam abertas sem plano (ajuda, suporte, conta e administração); o resto fica atrás da tela de vidro. */
const LIVRES = ["/app/conta", "/app/ajuda", "/app/suporte", "/app/admin"];

type Passo = "inicio" | "plano" | "cartao";

/**
 * Primeiros passos de quem ainda não tem plano: uma tela de vidro, com o Croqui desfocado atrás, que leva em etapas
 * (começar o teste grátis → escolher o plano → cartão) até o app. Ao concluir, a página recarrega já com o plano e os créditos.
 */
export default function Onboarding({ nome, plans, trialDias, trialCreditos, needsDoc, billingOn }: { nome: string; plans: PlanoOb[]; trialDias: number; trialCreditos: number; needsDoc: boolean; billingOn: boolean }) {
  const t = useT();
  const path = usePathname();
  const [passo, setPasso] = useState<Passo>("inicio");
  const [planoId, setPlanoId] = useState(plans.find((p) => p.destaque)?.id ?? plans[0]?.id);
  const [cupomAberto, setCupomAberto] = useState(false);
  const [cupom, setCupom] = useState("");
  const [cupomMsg, setCupomMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (LIVRES.some((p) => path === p || path.startsWith(p + "/"))) return null;
  const plano = plans.find((p) => p.id === planoId) ?? plans[0];
  const primeiro = (nome.trim().split(/[\s@]/)[0] || "").slice(0, 30);
  const trial = trialDias > 0;
  const nPassos = 3, atual = passo === "inicio" ? 1 : passo === "plano" ? 2 : 3;

  async function usarCupom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setCupomMsg("");
    try {
      const r = await fetch("/api/cupom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cupom }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setCupomMsg(j.error || "Não foi possível usar o cupom agora. Tente de novo.");
      else if (j.desconto) { try { localStorage.setItem("croqui.cupom", cupom.trim()); } catch { /* ok */ } setCupomMsg("Cupom válido! Ele será aplicado quando você escolher um plano para assinar."); }
      else location.assign("/app"); // acesso sem cartão (VDO Club): plano e créditos já entraram
    } catch { setCupomMsg("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
  }

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label={t("Primeiros passos")}>
      <div className={`ob-card ${passo === "inicio" ? "sm" : ""}`}>
        <div className="ob-top">
          <span className="ob-logo"><Logo /></span>
          <span className="ob-dots" aria-label={`${atual}/${nPassos}`}>{Array.from({ length: nPassos }, (_, i) => <i key={i} className={i < atual ? "on" : ""} />)}</span>
        </div>

        {passo === "inicio" && (
          <div className="ob-body ob-center">
            <h1>{t("Bem-vindo ao Croqui")}{primeiro ? `, ${primeiro}` : ""}!</h1>
            {trial ? (<>
              <p className="ob-lead">{t("Sua conta está criada. Falta só começar o seu teste grátis.")}</p>
              <ul className="ob-list">
                <li><b>{trialDias} {t("dias grátis")}</b></li>
                <li><b>{trialCreditos} {t("créditos")}</b> {t("para usar no teste")}</li>
                <li>{t("A cobrança só acontece depois do teste. Cancele antes e você não paga nada.")}</li>
              </ul>
            </>) : <p className="ob-lead">{t("Sua conta está criada. Escolha seu plano para começar a usar o Croqui.")}</p>}
            <button type="button" className="full" onClick={() => setPasso("plano")}>{trial ? t("Começar teste grátis") : t("Escolher meu plano")}</button>
            {!cupomAberto ? <button type="button" className="ghost ob-link" onClick={() => setCupomAberto(true)}>{t("Tenho um cupom")}</button> : (
              <form onSubmit={usarCupom} className="ob-cupom">
                <input value={cupom} onChange={(e) => setCupom(e.target.value)} placeholder={t("Digite o cupom")} aria-label={t("Cupom de desconto")} autoCapitalize="characters" autoComplete="off" />
                <button type="submit" className="ghost" disabled={busy || !cupom.trim()}>{t("Usar cupom")}</button>
              </form>
            )}
            {cupomMsg && <p className="small" role="status">{t(cupomMsg)}</p>}
          </div>
        )}

        {passo === "plano" && (
          <div className="ob-body">
            <h1>{t("Escolha seu plano")}</h1>
            <p className="ob-lead">{trial ? `${t("Você começa com")} ${trialDias} ${t("dias grátis")} ${t("e")} ${trialCreditos} ${t("créditos")}. ${t("Só depois do teste o plano escolhido é cobrado.")}` : t("O plano é cobrado no cartão todo mês.")}</p>
            <div className="ob-plans" role="radiogroup" aria-label={t("Planos")}>
              {plans.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={planoId === p.id} className={`ob-plan ${planoId === p.id ? "on" : ""}`} onClick={() => setPlanoId(p.id)}>
                  {p.destaque && <span className="ob-tag">{t("mais escolhido")}</span>}
                  <strong>{t(p.nome)}</strong>
                  <span className="ob-price">{brl(p.preco)}<small>/{t("mês")}</small></span>
                  <span className="ob-credits">{p.creditosMes.toLocaleString("pt-BR")} {t("créditos por mês")}</span>
                  <span className="small muted">{t("até {n} renders rápidos por mês", { n: Math.floor(p.creditosMes / COSTS.renderPorImagem).toLocaleString("pt-BR") })}</span>
                  <ul>{p.itens.map((i) => <li key={i}><Icon name="check" />{t(i)}</li>)}</ul>
                  <span className="ob-pick" aria-hidden="true">{planoId === p.id ? t("Selecionado") : t("Selecionar")}</span>
                </button>
              ))}
            </div>
            {!billingOn && <p className="alert err" role="alert">{t("A cobrança online ainda não está ativa. Fale com o suporte para contratar.")}</p>}
            <div className="ob-actions">
              <button type="button" className="ghost" onClick={() => setPasso("inicio")}>{t("Voltar")}</button>
              <button type="button" disabled={!billingOn} onClick={() => setPasso("cartao")}>{t("Avançar")}</button>
            </div>
          </div>
        )}

        {passo === "cartao" && plano && (
          <div className="ob-body">
            <CheckoutForm
              key={plano.id}
              embedded
              onDone={() => location.assign("/app")}
              onBack={() => setPasso("plano")}
              itemId={plano.id}
              isPlan
              title={`${t("Plano")} ${t(plano.nome)}`}
              price={plano.preco}
              detail={`${plano.creditosMes} ${t("créditos por mês")}`}
              needsDoc={needsDoc}
              blocked=""
              trialDias={trialDias}
              trialCreditos={trialCreditos}
            />
          </div>
        )}

        <p className="small muted ob-foot"><a href="/app/suporte">{t("Suporte")}</a> · <button type="button" className="ghost ob-link" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>{t("Sair")}</button></p>
      </div>
    </div>
  );
}
