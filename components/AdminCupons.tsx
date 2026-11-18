"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Linha = { semCartao: boolean; tipo: string; desconto: number; code: string; creditos: number; dias: number; plano: string; limite: number | null; validoAte: string | null; ativo: boolean; usos: number };

/** Painel de administração: criar, ativar/desativar e copiar o link dos cupons. */
export default function AdminCupons({ cupons, planos, origem }: { cupons: Linha[]; planos: { id: string; nome: string }[]; origem: string }) {
  const router = useRouter();
  const [f, setF] = useState({ code: "", semCartao: false, tipo: "acesso", desconto: "", creditos: "300", dias: "30", plano: "max", limite: "", validoAte: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(body: object) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/cupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "Não foi possível salvar.");
      else { router.refresh(); return true; }
    } catch { setMsg("Sem conexão."); }
    finally { setBusy(false); }
    return false;
  }
  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (await enviar(f)) setF({ ...f, code: "" });
  }
  async function copiar(code: string) {
    const url = `${origem}/cadastro?cupom=${encodeURIComponent(code)}`;
    try { await navigator.clipboard.writeText(url); setMsg(`Link copiado: ${url}`); } catch { setMsg(url); }
  }
  const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "sem data");

  return (
    <div className="card">
      <h2>Cupons de desconto</h2>
      <form onSubmit={criar} className="acform">
        <label>Código<input value={f.code} onChange={set("code")} placeholder="vdoclub" required autoCapitalize="none" autoComplete="off" /></label>
        <label>Tipo<select value={f.tipo} onChange={set("tipo")}><option value="acesso">Acesso grátis (plano + créditos)</option><option value="percentual">Desconto em %</option><option value="valor">Desconto em R$</option></select></label>
        {f.tipo === "acesso" ? (<>
          <label>Créditos<input type="number" min={0} value={f.creditos} onChange={set("creditos")} required /></label>
          <label>Dias de plano<input type="number" min={1} max={365} value={f.dias} onChange={set("dias")} required /></label>
          <label>Plano<select value={f.plano} onChange={set("plano")}>{planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
          <label className="acchk"><span>Cartão</span><span className="row gap" style={{ flexWrap: "nowrap", alignItems: "center" }}><input type="checkbox" checked={f.semCartao} onChange={(e) => setF({ ...f, semCartao: e.target.checked })} /> <span>Sem cartão (só VDO Club)</span></span></label>
        </>) : (
          <label>{f.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}<input type="number" min={0} step={f.tipo === "percentual" ? 1 : 0.01} value={f.desconto} onChange={set("desconto")} placeholder={f.tipo === "percentual" ? "20" : "10,00"} required /></label>
        )}
        <label>Limite de contas<input type="number" min={1} value={f.limite} onChange={set("limite")} placeholder="sem limite" /></label>
        <label>Vale até<input type="date" value={f.validoAte} onChange={set("validoAte")} /></label>
        <button type="submit" disabled={busy}>Criar cupom</button>
      </form>
      {msg && <p className="small" role="status">{msg}</p>}
      <div className="atable-wrap">
        <table className="atable">
          <thead><tr><th>Código</th><th>Tipo</th><th>Benefício</th><th>Usos</th><th>Vale até</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {cupons.length === 0 && <tr><td colSpan={7} className="muted">Nenhum cupom ainda.</td></tr>}
            {cupons.map((c) => (
              <tr key={c.code}>
                <td><b>{c.code.toUpperCase()}</b></td>
                <td>{c.tipo === "acesso" ? (c.semCartao ? "Acesso sem cartão" : "Acesso com cartão") : c.tipo === "percentual" ? "Desconto %" : "Desconto R$"}</td>
                <td>{c.tipo === "acesso" ? `${planos.find((p) => p.id === c.plano)?.nome ?? c.plano} · ${c.creditos} créditos · ${c.dias} dias` : c.tipo === "percentual" ? `${c.desconto}% em todas as mensalidades` : `R$ ${c.desconto.toFixed(2).replace(".", ",")} em todas as mensalidades`}</td>
                <td>{c.usos}{c.limite != null ? ` / ${c.limite}` : ""}</td>
                <td>{data(c.validoAte)}</td>
                <td>{c.ativo ? "Ativo" : "Desativado"}</td>
                <td className="row gap" style={{ flexWrap: "nowrap" }}>
                  <button type="button" className="ghost" onClick={() => copiar(c.code)}>Copiar link</button>
                  <button type="button" className="ghost" disabled={busy} onClick={() => enviar({ ...c, semCartao: c.semCartao, validoAte: c.validoAte ? c.validoAte.slice(0, 10) : "", limite: c.limite ?? "", ativo: !c.ativo })}>{c.ativo ? "Desativar" : "Ativar"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
