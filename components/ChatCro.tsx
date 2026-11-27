"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Mascote, { type Humor } from "./Mascote";
import { useCredits } from "./useCredits";
import { nivelSaldo } from "@/lib/saldo";
import { useT } from "./I18nProvider";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "croqui.chat";
export const ABRIR_CRO = "cro-abrir";
/** Qualquer botão do app abre o chat disparando este evento. */
export const abrirCro = () => window.dispatchEvent(new Event(ABRIR_CRO));

const SUGESTOES = ["Como faço um render?", "Quanto custa cada ferramenta?", "O que é o memorial descritivo?", "Como funcionam os créditos?"];

/** **negrito**, listas com "- " e caminhos /app/... viram link, sem HTML solto. */
function Texto({ s, onNav }: { s: string; onNav: () => void }) {
  const inline = (x: string, k: string) => x.split(/(\*\*[^*]+\*\*|\/app\/[a-z0-9/-]+)/g).filter(Boolean).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={`${k}${i}`}>{p.slice(2, -2)}</strong>
    : p.startsWith("/app/") ? <Link key={`${k}${i}`} href={p.replace(/[.,;:)]+$/, "")} onClick={onNav}>{p}</Link>
    : <span key={`${k}${i}`}>{p}</span>);
  const blocos: React.ReactNode[] = [];
  let lista: string[] = [];
  const fecha = (k: number) => { if (lista.length) { blocos.push(<ul key={`u${k}`}>{lista.map((x, i) => <li key={i}>{inline(x, `l${k}${i}`)}</li>)}</ul>); lista = []; } };
  s.split("\n").filter((l) => l.trim()).forEach((l, k) => {
    if (/^\s*[-*] /.test(l)) { lista.push(l.replace(/^\s*[-*] /, "")); return; }
    fecha(k);
    blocos.push(<p key={k}>{inline(l, `p${k}`)}</p>);
  });
  fecha(999);
  return <>{blocos}</>;
}

/**
 * Chat do Cro: painel flutuante com o assistente de IA do Croqui. Abre por evento (botão no menu lateral e na barra do topo).
 * O histórico fica só neste navegador (localStorage); o servidor recebe as últimas mensagens a cada pergunta.
 */
export default function ChatCro({ nome, creditos, limite }: { nome: string; creditos: number; limite: number }) {
  const t = useT();
  const saldo = useCredits(creditos);
  const nivel = saldo == null ? "ok" : nivelSaldo(saldo, limite);
  const humorBase: Humor = nivel === "acabou" ? "triste" : nivel === "baixo" ? "preocupado" : "feliz";
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s).slice(-20)); } catch { /* sem armazenamento */ }
    const abre = () => setAberto(true);
    window.addEventListener(ABRIR_CRO, abre);
    return () => window.removeEventListener(ABRIR_CRO, abre);
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-20))); } catch { /* ok */ } }, [msgs]);
  useEffect(() => { if (aberto) { fim.current?.scrollIntoView({ block: "end" }); setTimeout(() => campo.current?.focus(), 60); } }, [aberto, msgs, busy]);
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aberto]);

  async function enviar(texto: string) {
    const pergunta = texto.trim().slice(0, 500);
    if (!pergunta || busy) return;
    setErro(""); setTxt("");
    const novo: Msg[] = [...msgs, { role: "user", content: pergunta }];
    setMsgs(novo); setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: novo.slice(-8) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro(j.error || "Não consegui responder agora. Tente de novo.");
      else setMsgs([...novo, { role: "assistant", content: String(j.reply || "") }]);
    } catch { setErro("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
  }

  if (!aberto) return (
    <button type="button" className="cro-fab" onClick={() => setAberto(true)} aria-label={t("Falar com o Cro")} title={t("Falar com o Cro")}>
      <Mascote size={66} humor={humorBase} />
    </button>
  );
  const primeiro = (nome.trim().split(/[\s@]/)[0] || "").slice(0, 30);
  return (
    <>
      <div className="cro-scrim" onClick={() => setAberto(false)} />
      <section className="cro-chat" role="dialog" aria-label={t("Chat com o Cro")}>
        <header className="cro-head">
          <Mascote size={44} humor={busy ? "pensando" : humorBase} animado={false} />
          <div><strong>Cro</strong><span className="small muted">{t("Assistente do Croqui")}</span></div>
          <button type="button" className="ghost cro-x" onClick={() => setAberto(false)} aria-label={t("Fechar")}>✕</button>
        </header>
        <div className="cro-msgs" role="log" aria-live="polite">
          {msgs.length === 0 && (
            <div className="cro-hello">
              <p>{t("Oi")}{primeiro ? `, ${primeiro}` : ""}! {nivel === "acabou" ? t("Seus créditos acabaram. Posso te explicar como comprar mais ou qual plano combina com você.") : nivel === "baixo" ? t("Seus créditos estão acabando. Posso te ajudar a escolher como recarregar.") : t("Eu sou o Cro. Pergunte como usar uma ferramenta, quanto custa ou como funcionam os créditos.")}</p>
              <div className="cro-sug">{SUGESTOES.map((s) => <button key={s} type="button" className="chip" onClick={() => enviar(t(s))}>{t(s)}</button>)}</div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`cro-m ${m.role === "user" ? "eu" : "cro"}`}>
              {m.role === "assistant" ? <Texto s={m.content} onNav={() => setAberto(false)} /> : <p>{m.content}</p>}
            </div>
          ))}
          {busy && <div className="cro-m cro"><span className="cro-dots" aria-label={t("Digitando…")}><i /><i /><i /></span></div>}
          {erro && <p className="alert err small" role="alert">{t(erro)}</p>}
          <div ref={fim} />
        </div>
        <form className="cro-form" onSubmit={(e) => { e.preventDefault(); void enviar(txt); }}>
          <textarea ref={campo} rows={1} maxLength={500} value={txt} placeholder={t("Escreva sua dúvida…")} aria-label={t("Escreva sua dúvida…")}
            onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(txt); } }} />
          <button type="submit" disabled={busy || !txt.trim()}>{t("Enviar")}</button>
        </form>
        <p className="small muted cro-foot">{t("O Cro é uma IA e pode errar. Para cobrança ou problemas na conta, fale com o")} <Link href="/app/suporte" onClick={() => setAberto(false)}>{t("Suporte")}</Link>.
          {msgs.length > 0 && <> · <button type="button" className="ghost ob-link" onClick={() => { setMsgs([]); setErro(""); }}>{t("Limpar conversa")}</button></>}</p>
      </section>
    </>
  );
}
