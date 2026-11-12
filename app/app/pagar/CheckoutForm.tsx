"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";

type Method = "PIX" | "CREDIT_CARD";
type Result = { kind: "pix"; paymentId: string; image: string; payload: string; expiresAt?: string } | { kind: "card"; paymentId: string; status: string } | { kind: "done" } | { kind: "scheduled"; at: string };
type Change = { mode: "upgrade" | "downgrade" | "keep"; amount: number; extraCredits: number; nextDue: string; newPrice: number };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const onlyDigits = (s: string) => s.replace(/\D/g, "");
const groups = (s: string) => onlyDigits(s).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const maskDoc = (s: string) => { const d = onlyDigits(s).slice(0, 14); return d.length <= 11 ? d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2") : d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2"); };
const maskCep = (s: string) => onlyDigits(s).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const maskPhone = (s: string) => onlyDigits(s).slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4,5})(\d{4})$/, "$1-$2");
const maskExp = (s: string) => onlyDigits(s).slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

const EMPTY = { number: "", holderName: "", exp: "", ccv: "", postalCode: "", addressNumber: "", phone: "" };

/** Troca de plano sem cartão: downgrade, manter o plano ou upgrade abaixo do mínimo de cobrança. */
export default function CheckoutForm({ itemId, isPlan, title, price, detail, needsDoc, blocked, change }: { itemId: string; isPlan: boolean; title: string; price: number; detail: string; needsDoc: boolean; blocked: string; change?: Change }) {
  const t = useT();
  const [method, setMethod] = useState<Method>(isPlan ? "CREDIT_CARD" : "PIX");
  const [doc, setDoc] = useState("");
  const [card, setCard] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const stop = useRef(false);
  const needCard = method === "CREDIT_CARD" && (!change || (change.mode === "upgrade" && change.amount >= 5));
  const set = (k: keyof typeof EMPTY, f: (s: string) => string = (s) => s) => (e: React.ChangeEvent<HTMLInputElement>) => setCard((c) => ({ ...c, [k]: f(e.target.value) }));

  // depois do pagamento a tela pergunta ao servidor (que recebe o webhook do Asaas) se já foi confirmado
  useEffect(() => {
    if (!res || paid || !("paymentId" in res)) return;
    const paymentId = res.paymentId;
    stop.current = false;
    let tries = 0;
    const tick = async () => {
      if (stop.current) return;
      try {
        const j = await fetch(`/api/billing/status?paymentId=${encodeURIComponent(paymentId)}`, { cache: "no-store" }).then((r) => r.json());
        if (j.paid) { setPaid(true); window.dispatchEvent(new Event("credits-changed")); return; }
      } catch { /* tenta de novo */ }
      if (++tries < 300) setTimeout(tick, tries < 20 ? 3000 : 6000);
    };
    const first = setTimeout(tick, 2000);
    return () => { stop.current = true; clearTimeout(first); };
  }, [res, paid]);

  async function pay() {
    setErr(""); setBusy(true);
    const [mm, yy] = card.exp.split("/");
    const body: Record<string, unknown> = { id: itemId, method, cpfCnpj: doc };
    if (needCard) body.card = { holderName: card.holderName, number: onlyDigits(card.number), expiryMonth: mm || "", expiryYear: yy ? `20${yy}` : "", ccv: card.ccv, postalCode: card.postalCode, addressNumber: card.addressNumber, phone: card.phone };
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Não foi possível iniciar o pagamento."); setBusy(false); return; }
      setCard(EMPTY); // os dados do cartão não ficam na memória da tela
      setRes(j);
    } catch {
      setErr("Sem conexão. Verifique a internet e tente de novo.");
    }
    setBusy(false);
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* o usuário copia à mão */ }
  }

  const needDocField = needCard || (needsDoc && !change);
  const cardReady = !needCard || (onlyDigits(card.number).length >= 13 && card.holderName.trim().length > 2 && card.exp.length === 5 && card.ccv.length >= 3 && onlyDigits(card.postalCode).length === 8 && card.addressNumber && onlyDigits(card.phone).length >= 10);
  const ready = !blocked && cardReady && (!needDocField || onlyDigits(doc).length >= 11);

  if (paid) return (
    <>
      <h1>{t("Pagamento confirmado")}</h1>
      <div className="card"><p>{t("Tudo certo! Seus créditos já estão na conta.")}</p><Link href="/app/creditos?pagamento=ok" className="btn">{t("Ver meus créditos")}</Link></div>
    </>
  );

  return (
    <>
      <h1>{t("Pagamento")}</h1>
      <div className="paygrid">
        <div className="card">
          <h2>{t("Resumo")}</h2>
          <p style={{ margin: "6px 0 2px" }}><b>{title}</b></p>
          {detail && <p className="small muted" style={{ margin: 0 }}>{detail}</p>}
          {change ? (
            <>
              <p className="paytotal">{brl(change.mode === "upgrade" ? change.amount : 0)}<span> {t("hoje")}</span></p>
              {change.mode === "upgrade" && <p className="small muted">{t("Diferença proporcional ao que falta do período atual.")} {change.extraCredits > 0 ? `+${change.extraCredits} ${t("créditos extras agora")}. ` : ""}{t("Próxima renovação em")} {change.nextDue}: {brl(change.newPrice)} / {t("mês")}.</p>}
              {change.mode === "downgrade" && <p className="small muted">{t("Você continua no plano atual até")} {change.nextDue}. {t("A partir daí, o plano novo custa")} {brl(change.newPrice)} / {t("mês")}.</p>}
              {change.mode === "keep" && <p className="small muted">{t("Cancela a troca agendada e mantém o plano atual.")}</p>}
            </>
          ) : <p className="paytotal">{brl(price)}{isPlan ? <span> / {t("mês")}</span> : null}</p>}
          {isPlan && <p className="small muted">{t("A assinatura renova todo mês no mesmo cartão. Você pode cancelar a renovação quando quiser, em Créditos e planos.")}</p>}
          <p className="small muted"><span aria-hidden="true">🔒 </span>{t("Pagamento seguro processado pelo Asaas. Os dados do cartão não são guardados pelo Croqui.")}</p>
        </div>

        <div className="card">
          {blocked && <p className="alert err" role="alert">{blocked}</p>}
          {!res && (
            <>
              {!isPlan && (
                <div className="field"><label>{t("Forma de pagamento")}</label>
                  <div className="seg" role="group" aria-label={t("Forma de pagamento")}>
                    <button type="button" className={method === "PIX" ? "on" : ""} aria-pressed={method === "PIX"} onClick={() => setMethod("PIX")}>Pix</button>
                    <button type="button" className={method === "CREDIT_CARD" ? "on" : ""} aria-pressed={method === "CREDIT_CARD"} onClick={() => setMethod("CREDIT_CARD")}>{t("Cartão de crédito")}</button>
                  </div>
                </div>
              )}
              {isPlan && !change && <p className="small muted" style={{ marginTop: 0 }}>{t("Os planos são pagos somente no cartão de crédito.")}</p>}

              {needDocField && (
                <div className="field"><label htmlFor="doc">{method === "CREDIT_CARD" ? t("CPF ou CNPJ do titular do cartão") : t("CPF ou CNPJ")}</label>
                  <input id="doc" type="text" inputMode="numeric" autoComplete="off" value={doc} onChange={(e) => setDoc(maskDoc(e.target.value))} placeholder="000.000.000-00" /></div>
              )}

              {needCard && (
                <>
                  <div className="field"><label htmlFor="cc-number">{t("Número do cartão")}</label>
                    <input id="cc-number" type="text" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={set("number", groups)} placeholder="0000 0000 0000 0000" /></div>
                  <div className="field"><label htmlFor="cc-name">{t("Nome impresso no cartão")}</label>
                    <input id="cc-name" type="text" autoComplete="cc-name" value={card.holderName} onChange={set("holderName")} /></div>
                  <div className="payrow">
                    <div className="field"><label htmlFor="cc-exp">{t("Validade")}</label>
                      <input id="cc-exp" type="text" inputMode="numeric" autoComplete="cc-exp" value={card.exp} onChange={set("exp", maskExp)} placeholder="MM/AA" /></div>
                    <div className="field"><label htmlFor="cc-csc">{t("Código de segurança")}</label>
                      <input id="cc-csc" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.ccv} onChange={set("ccv", onlyDigits)} placeholder="CVV" /></div>
                  </div>
                  <p className="small muted" style={{ margin: "4px 0 0" }}>{t("Endereço de cobrança do cartão")}</p>
                  <div className="payrow">
                    <div className="field"><label htmlFor="cep">{t("CEP")}</label>
                      <input id="cep" type="text" inputMode="numeric" autoComplete="postal-code" value={card.postalCode} onChange={set("postalCode", maskCep)} placeholder="00000-000" /></div>
                    <div className="field"><label htmlFor="num">{t("Número")}</label>
                      <input id="num" type="text" autoComplete="off" value={card.addressNumber} onChange={set("addressNumber")} /></div>
                  </div>
                  <div className="field"><label htmlFor="tel">{t("Telefone com DDD")}</label>
                    <input id="tel" type="text" inputMode="tel" autoComplete="tel" value={card.phone} onChange={set("phone", maskPhone)} placeholder="(00) 00000-0000" /></div>
                </>
              )}

              {err && <p className="alert err" role="alert">{t(err)}</p>}
              <button type="button" className="full" disabled={busy || !ready} aria-busy={busy} onClick={pay}>
                {busy ? t("Processando…") : method === "PIX" ? t("Gerar QR Code Pix") : change && !needCard ? t("Confirmar troca de plano") : `${t("Pagar")} ${brl(change ? change.amount : price)}`}
              </button>
              <p className="small muted" style={{ textAlign: "center" }}><Link href="/app/creditos">{t("Voltar para Créditos e planos")}</Link></p>
            </>
          )}

          {res?.kind === "pix" && (
            <div className="pixbox">
              <h2>{t("Pague com Pix")}</h2>
              <p className="small muted">{t("Abra o app do seu banco, escolha Pix e leia o QR Code ou use o código copia e cola. Os créditos entram assim que o pagamento for confirmado.")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pixqr" src={`data:image/png;base64,${res.image}`} alt={t("QR Code do Pix")} width={220} height={220} />
              <label htmlFor="pixcode">{t("Pix copia e cola")}</label>
              <textarea id="pixcode" readOnly className="short" value={res.payload} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={() => copy(res.payload)}>{copied ? t("Código copiado!") : t("Copiar código")}</button>
              <p className="small muted" role="status" aria-live="polite">{t("Aguardando a confirmação do pagamento…")}{res.expiresAt ? ` · ${t("o QR Code vale até")} ${res.expiresAt}` : ""}</p>
            </div>
          )}

          {(res?.kind === "done" || res?.kind === "scheduled") && (
            <div className="pixbox">
              <h2>{t("Troca de plano confirmada")}</h2>
              <p role="status">{res.kind === "scheduled" ? t("O novo plano começa na próxima renovação.") : t("Pronto! A mudança já vale.")}</p>
              <Link href="/app/creditos" className="btn">{t("Ver meus créditos")}</Link>
            </div>
          )}

          {res?.kind === "card" && (
            <div className="pixbox">
              <h2>{t("Pagamento enviado")}</h2>
              <p role="status" aria-live="polite">{t("Estamos confirmando o pagamento com o banco. Isso leva alguns segundos.")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
