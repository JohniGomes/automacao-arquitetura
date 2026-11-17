"use client";
import { useRef, useState } from "react";
import { avatarMudou } from "./Avatar";
import { useT } from "./I18nProvider";

/** Botões "Escolher foto" e "Remover foto" do perfil. */
export default function AvatarForm() {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function enviar(file: File) {
    setBusy(true); setMsg("");
    try {
      const fd = new FormData();
      fd.set("foto", file);
      const r = await fetch("/api/avatar", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "Não foi possível salvar a foto.");
      else avatarMudou();
    } catch { setMsg("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
    if (input.current) input.current.value = "";
  }
  async function remover() {
    setBusy(true); setMsg("");
    try { await fetch("/api/avatar", { method: "DELETE" }); avatarMudou(); } catch { setMsg("Sem conexão. Verifique a internet e tente de novo."); }
    setBusy(false);
  }

  return (
    <div className="avatar-actions">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviar(f); }} />
      <button type="button" className="ghost" disabled={busy} onClick={() => input.current?.click()}>{t("Escolher foto")}</button>
      <button type="button" className="ghost" disabled={busy} onClick={remover}>{t("Remover foto")}</button>
      {msg && <span className="small" role="status">{t(msg)}</span>}
    </div>
  );
}
