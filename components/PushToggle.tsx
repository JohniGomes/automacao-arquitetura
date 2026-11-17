"use client";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

type Estado = "carregando" | "semservidor" | "indisponivel" | "ios" | "bloqueado" | "desligado" | "ligado";

function chaveParaBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Ativa/desativa os avisos de geração concluída neste aparelho (Web Push). Some se o servidor não tem as chaves. */
export default function PushToggle() {
  const t = useT();
  const [estado, setEstado] = useState<Estado>("carregando");
  const [chave, setChave] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const k = await fetch("/api/push/key").then((r) => r.json());
        if (!k.ativo) return setEstado("semservidor");
        setChave(k.chave);
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = (navigator as any).standalone || matchMedia("(display-mode: standalone)").matches;
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado(ios && !standalone ? "ios" : "indisponivel");
        if (Notification.permission === "denied") return setEstado("bloqueado");
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        setEstado(sub && Notification.permission === "granted" ? "ligado" : "desligado");
      } catch { setEstado("indisponivel"); }
    })();
  }, []);

  async function ativar() {
    setBusy(true); setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setEstado(perm === "denied" ? "bloqueado" : "desligado"); setBusy(false); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) }));
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || "Não foi possível ativar agora."); setBusy(false); return; }
      setEstado("ligado");
    } catch { setMsg("Não foi possível ativar agora."); }
    setBusy(false);
  }
  async function desativar() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
      setEstado("desligado");
    } catch { setMsg("Não foi possível desativar agora."); }
    setBusy(false);
  }

  if (estado === "carregando") return null;
  return (
    <div className="pushbox">
      {estado === "ligado" ? (<>
        <p className="small">{t("Avisos ativados neste aparelho.")}</p>
        <button type="button" className="ghost" disabled={busy} onClick={desativar}>{t("Desativar avisos")}</button>
      </>) : estado === "ios" ? (
        <p className="small muted">{t("No iPhone, adicione o Croqui à Tela de Início para receber avisos.")}</p>
      ) : estado === "semservidor" ? (
        <p className="small muted">{t("Os avisos ainda não estão configurados no servidor.")}</p>
      ) : estado === "indisponivel" ? (
        <p className="small muted">{t("Este navegador não permite avisos. Tente pelo Chrome ou instale o Croqui na Tela de Início.")}</p>
      ) : estado === "bloqueado" ? (
        <p className="small muted">{t("A permissão de avisos está bloqueada no navegador.")}</p>
      ) : (<>
        <p className="small muted">{t("Você recebe um aviso quando uma geração terminar, mesmo com o app fechado.")}</p>
        <button type="button" disabled={busy} onClick={ativar}>{t("Ativar avisos neste aparelho")}</button>
      </>)}
      {msg && <p className="small" role="status">{t(msg)}</p>}
    </div>
  );
}
