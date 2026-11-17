"use client";
import { useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";

type Dados = { nome: string; responsavel: string; registro: string; cor: string; logo: string | null };

/** Formulário da marca do escritório. O plano Profissional preenche logo e nome; o Max também responsável técnico, registro e cor. */
export default function EscritorioForm({ nivel, inicial }: { nivel: "basica" | "completa"; inicial: Dados | null }) {
  const t = useT();
  const [d, setD] = useState<Dados>(inicial ?? { nome: "", responsavel: "", registro: "", cor: "", logo: null });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [remover, setRemover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof Dados) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  const completa = nivel === "completa";
  const preview = arquivo ? URL.createObjectURL(arquivo) : !remover && d.logo ? `/api/files/${d.logo}` : "";

  async function salvar() {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set("nome", d.nome);
    if (completa) { fd.set("responsavel", d.responsavel); fd.set("registro", d.registro); fd.set("cor", d.cor); }
    if (arquivo) fd.set("logo", arquivo);
    if (remover) fd.set("removerLogo", "1");
    try {
      const r = await fetch("/api/escritorio", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg({ ok: false, texto: j.error || "Não foi possível salvar." });
      else { setMsg({ ok: true, texto: "Salvo." }); setArquivo(null); setRemover(false); location.reload(); }
    } catch { setMsg({ ok: false, texto: "Sem conexão. Verifique a internet e tente de novo." }); }
    setBusy(false);
  }

  return (
    <div className="card">
      <p className="small muted">{t("Aparece nas pranchas do mapa de situação.")}</p>
      <div className="field">
        <label>{t("Logo")}</label>
        {preview && <img src={preview} alt={t("Logo")} style={{ maxWidth: 260, maxHeight: 80, display: "block", marginBottom: 8, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 6 }} />}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setRemover(false); }} />
        {(d.logo || arquivo) && <button type="button" className="textbtn" onClick={() => { setArquivo(null); setRemover(true); if (fileRef.current) fileRef.current.value = ""; }}>{t("Remover logo")}</button>}
      </div>
      <div className="field"><label htmlFor="e-nome">{t("Nome do escritório")}</label><input id="e-nome" style={{ width: "100%" }} value={d.nome} onChange={set("nome")} maxLength={80} /></div>
      {completa && (<>
        <div className="field"><label htmlFor="e-resp">{t("Responsável técnico")}</label><input id="e-resp" style={{ width: "100%" }} value={d.responsavel} onChange={set("responsavel")} maxLength={80} /></div>
        <div className="field"><label htmlFor="e-reg">{t("Registro (CAU ou CREA)")}</label><input id="e-reg" style={{ width: "100%" }} value={d.registro} onChange={set("registro")} maxLength={40} placeholder="CAU A00000-0" /></div>
        <div className="field"><label htmlFor="e-cor">{t("Cor de destaque")}</label>
          <input id="e-cor" type="color" value={/^#[0-9a-f]{6}$/i.test(d.cor) ? d.cor : "#d6402f"} onChange={(e) => setD((x) => ({ ...x, cor: e.target.value }))} style={{ width: 64, height: 36, padding: 2 }} />
        </div>
      </>)}
      <button type="button" disabled={busy} onClick={salvar}>{busy ? t("Salvando…") : t("Salvar")}</button>
      {msg && <p className={msg.ok ? "small" : "alert err"} role="status">{t(msg.texto)}</p>}
    </div>
  );
}
