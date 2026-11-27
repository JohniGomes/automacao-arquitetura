"use client";
import { useEffect, useState } from "react";
import { useLang, useT } from "./I18nProvider";
import type { Novidade } from "@/lib/novidades";

/** Avisa que há uma versão nova (o que mudou + botão Atualizar). Compara a versão carregada com a do servidor ao voltar
 *  para a aba e a cada 5 minutos. Não interrompe: o usuário escolhe quando atualizar. */
export default function AvisoAtualizacao({ versao }: { versao: string }) {
  const t = useT();
  const lang = useLang() === "en" ? "en" : "pt";
  const [nova, setNova] = useState<Novidade | null>(null);
  const [dispensada, setDispensada] = useState("");

  useEffect(() => {
    let vivo = true;
    const checar = async () => {
      try {
        const r = await fetch("/api/versao", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { versao?: string; novidade?: Novidade };
        if (vivo && j.versao && j.versao !== versao && j.novidade) setNova(j.novidade);
      } catch { /* sem rede: tenta de novo depois */ }
    };
    const ao = () => { if (document.visibilityState === "visible") void checar(); };
    const id = setInterval(checar, 5 * 60_000);
    document.addEventListener("visibilitychange", ao);
    window.addEventListener("online", checar);
    return () => { vivo = false; clearInterval(id); document.removeEventListener("visibilitychange", ao); window.removeEventListener("online", checar); };
  }, [versao]);

  if (!nova || dispensada === nova.id) return null;
  return (
    <aside className="upd" role="status" aria-live="polite">
      <div className="upd-top">
        <span className="upd-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5 5 1.9-5 1.9L12 17l-1.9-5.2-5-1.9 5-1.9z" /><path d="M19 15l.8 1.8 1.8.8-1.8.8L19 20l-.8-1.8-1.8-.8 1.8-.8z" /></svg>
        </span>
        <div>
          <strong>{t("Nova atualização")}</strong>
          <p className="upd-sub">{nova.titulo[lang]}</p>
        </div>
      </div>
      <ul className="upd-list">{nova.itens.map((i) => <li key={i.pt}>{i[lang]}</li>)}</ul>
      <div className="upd-acts">
        <button type="button" className="btn" onClick={() => window.location.reload()}>{t("Atualizar")}</button>
        <button type="button" className="btn ghost" onClick={() => setDispensada(nova.id)}>{t("Depois")}</button>
      </div>
    </aside>
  );
}
