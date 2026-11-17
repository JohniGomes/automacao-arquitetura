"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Logo from "./Logo";
import Icon from "./icons";
import { Gen } from "./client";
import { useLang, useT } from "./I18nProvider";
import { useCredits } from "./useCredits";

const SEEN_KEY = "croqui.notif.seen";

/** Tempo relativo curto ("há 5 min"), no idioma do app. */
function ago(iso: string, lang: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(lang === "en" ? "en" : "pt-BR", { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

/**
 * Barra de cima do celular: marca, créditos, notificações e perfil. As notificações são as gerações recentes (pronta, em andamento
 * ou com erro); o ponto vermelho aparece quando algo terminou depois da última vez que o painel foi aberto.
 */
export default function MobileTop({ name, credits }: { name: string; credits: number }) {
  const t = useT();
  const lang = useLang();
  const c = useCredits(credits);
  const [open, setOpen] = useState(false);
  const [gens, setGens] = useState<Gen[]>([]);
  const [seen, setSeen] = useState<string>("");

  const load = useCallback(() => {
    fetch("/api/jobs").then((r) => r.json()).then((j) => setGens(((j.generations || []) as Gen[]).slice(0, 8))).catch(() => {});
  }, []);
  useEffect(() => {
    try { setSeen(localStorage.getItem(SEEN_KEY) || ""); } catch { /* sem armazenamento */ }
    load();
    window.addEventListener("credits-changed", load); // o acompanhamento de uma geração dispara este evento a cada consulta
    return () => window.removeEventListener("credits-changed", load);
  }, [load]);

  const fim = (g: Gen) => (g.status === "done" || g.status === "error" ? g.finishedAt || g.createdAt : "");
  const unread = gens.filter((g) => fim(g) && fim(g) > seen).length;
  const running = gens.filter((g) => g.status === "queued" || g.status === "running").length;

  function toggle() {
    const abrir = !open;
    setOpen(abrir);
    if (abrir) {
      load();
      const now = new Date().toISOString();
      try { localStorage.setItem(SEEN_KEY, now); } catch { /* ok */ }
      // o ponto some só depois de ver a lista
      setTimeout(() => setSeen(now), 600);
    }
  }
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const inicial = (name.trim()[0] || "?").toUpperCase();
  return (
    <>
      <header className="mtop">
        <Link href="/app" className="mbrand" aria-label={t("Croqui, início")}><Logo /></Link>
        <div className="mtop-r">
          <Link href="/app/creditos" className="mcred" aria-label={t("Créditos")}><b>{c ?? "…"}</b> {t("créditos")}</Link>
          <button type="button" className="mbell" aria-label={t("Notificações")} aria-expanded={open} onClick={toggle}>
            <Icon name="bell" />
            {unread > 0 && <span className="mdot" aria-label={`${unread} ${t("novas")}`} />}
            {unread === 0 && running > 0 && <span className="mdot run" aria-hidden="true" />}
          </button>
          <Link href="/app/conta" className="mavatar" aria-label={t("Perfil")} title={name}>{inicial}</Link>
        </div>
      </header>
      {open && (
        <>
          <div className="dscrim" onClick={() => setOpen(false)} />
          <section className="mnotif" role="dialog" aria-modal="true" aria-label={t("Notificações")}>
            <div className="mnotif-head"><h2>{t("Notificações")}</h2><button type="button" className="ghost sheet-close" style={{ display: "inline-flex" }} aria-label={t("Fechar")} onClick={() => setOpen(false)}><Icon name="close" /></button></div>
            {gens.length === 0 ? <p className="muted small">{t("Nenhuma notificação ainda.")}</p> : (
              <ul>
                {gens.map((g) => (
                  <li key={g.id}>
                    <Link href={`/app/geracoes#g-${g.id}`} onClick={() => setOpen(false)}>
                      <span className={`mstat ${g.status}`} aria-hidden="true">{g.status === "done" ? "✓" : g.status === "error" ? "!" : "…"}</span>
                      <span className="mtxt"><strong>{t(g.summary)}</strong>
                        <span className="small muted">{g.status === "done" ? t("Pronto") : g.status === "error" ? t("Falhou") : t("Gerando…")} · {ago(fim(g) || g.createdAt, lang)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/app/geracoes" className="small" onClick={() => setOpen(false)}>{t("Todas as gerações")}</Link>
          </section>
        </>
      )}
    </>
  );
}
