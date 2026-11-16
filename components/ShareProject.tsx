"use client";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

type Estado = { token: string | null; permitido: boolean; motivo: string; limite: number | null; usados: number };

/** "Compartilhar com o cliente": cria, mostra, copia e desativa o link público de apresentação do projeto. */
export default function ShareProject({ projectId }: { projectId: string }) {
  const t = useT();
  const [e, setE] = useState<Estado | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const url = (token: string) => `${location.origin}/p/${token}`;
  useEffect(() => { fetch(`/api/projects/${projectId}/share`).then((r) => r.json()).then(setE).catch(() => {}); }, [projectId]);

  async function chamar(method: "POST" | "DELETE") {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/projects/${projectId}/share`, { method });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "Não foi possível concluir.");
      else setE(j);
    } catch { setMsg("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
  }
  async function copiar(token: string) {
    try { await navigator.clipboard.writeText(url(token)); setMsg("Link copiado."); } catch { setMsg(url(token)); }
  }

  if (!e) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>{t("Compartilhar com o cliente")}</h2>
      {e.token ? (<>
        <p className="small">{t("Link de apresentação ativo.")}</p>
        <input readOnly value={url(e.token)} onFocus={(ev) => ev.currentTarget.select()} style={{ width: "100%" }} aria-label={t("Compartilhar com o cliente")} />
        <div className="row gap" style={{ marginTop: 8 }}>
          <button type="button" onClick={() => copiar(e.token!)}>{t("Copiar link")}</button>
          <button type="button" className="ghost" disabled={busy} onClick={() => chamar("DELETE")}>{t("Desativar link")}</button>
        </div>
      </>) : e.permitido ? (<>
        <p className="small muted">{t("Quem tiver o link vê as imagens deste projeto, sem entrar na conta. Você pode desativar quando quiser.")}</p>
        <button type="button" disabled={busy} onClick={() => chamar("POST")}>{t("Gerar link")}</button>
      </>) : (
        <p className="small muted">{t(e.motivo)}</p>
      )}
      {msg && <p className="small" role="status">{t(msg)}</p>}
    </div>
  );
}
