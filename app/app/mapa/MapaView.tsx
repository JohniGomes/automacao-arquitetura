"use client";
import { useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import ToolShell from "@/components/ToolShell";
import { Fold, Seg } from "@/components/controls";
import MapPicker, { Marcacao, Pt } from "@/components/MapPicker";
import { COSTS } from "@/lib/costs";
import { useT } from "@/components/I18nProvider";

type Modo = "prancha" | "aerea" | "ambos";
const VAZIO = { logradouro: "", numero: "", quadra: "", bairro: "", cidade: "", uf: "", cep: "" };

export default function Mapa({ alcanceMax = 600 }: { alcanceMax?: number }) {
  const t = useT();
  const [address, setAddress] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState(""); const [mock, setMock] = useState(false);
  const [centro, setCentro] = useState<Pt | null>(null);
  const [marc, setMarc] = useState<Marcacao>({ pino: null, poligono: [] });
  const [form, setForm] = useState(VAZIO);
  const [modo, setModo] = useState<Modo>("prancha");
  const [raio, setRaio] = useState<"300" | "600" | "1000">("600");
  const [upload, setUpload] = useState<Val>(null);
  const [adv, setAdv] = useState(false);
  const { gen, error, busy, submit, cancel } = useJob();

  const set = (k: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cost = upload ? COSTS.mapa : modo === "ambos" ? COSTS.mapaAmbos : modo === "prancha" ? COSTS.mapaPrancha : COSTS.mapa;

  async function buscar() {
    if (!address.trim() || buscando) return;
    setBuscando(true); setErroBusca("");
    try {
      const r = await fetch(`/api/maps/geocode?address=${encodeURIComponent(address.trim())}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErroBusca(j.error || "Não foi possível buscar o endereço."); return; }
      const c: Pt = [j.lat, j.lon]; setMock(!!j.mock);
      setCentro(c);
      setMarc({ pino: c, poligono: [] });
      const e = j.endereco || {};
      setForm((f) => ({ ...f, logradouro: e.logradouro || "", numero: e.numero || "", bairro: e.bairro || "", cidade: e.cidade || "", uf: e.uf || "", cep: e.cep || "" }));
    } catch { setErroBusca("Sem conexão. Verifique a internet e tente de novo."); }
    finally { setBuscando(false); }
  }

  function gerar() {
    if (upload) { submit({ type: "mapa", address: address || form.logradouro, zoom: "18", upload }); return; }
    submit({ type: "mapa", modo, polygon: JSON.stringify(marc.poligono), raio, ...form });
  }

  return (
    <ToolShell
      title="Mapa de situação"
      tip="Dica: a prancha é um desenho técnico (lote, quadras, ruas, norte, escala e legenda), sem IA. A vista aérea é uma ilustração com IA: as posições são aproximadas, então confira antes de usar."
      cost={cost}
      busy={busy}
      canGenerate={!!upload || marc.poligono.length >= 3}
      onGenerate={gerar}
      panel={<>
        <Seg<Modo> label="O que gerar" value={modo} onChange={setModo} options={[
          { v: "prancha", label: "Prancha", desc: `Mapa de situação técnico, sem IA. ${COSTS.mapaPrancha} créditos.` },
          { v: "aerea", label: "Vista aérea", desc: `Ilustração aérea com IA (pins e terreno sobre o satélite). ${COSTS.mapa} créditos.` },
          { v: "ambos", label: "As duas", desc: `Prancha e vista aérea juntas. ${COSTS.mapaAmbos} créditos.` },
        ]} />
        <Seg<"300" | "600" | "1000"> label="Alcance da prancha" value={raio} onChange={setRaio} options={[{ v: "300", label: "300 m" }, { v: "600", label: "600 m" }, ...(alcanceMax >= 1000 ? [{ v: "1000" as const, label: "1 km" }] : [])]} />
        {alcanceMax < 1000 && <p className="small muted" style={{ margin: "-6px 2px 10px" }}>{t("O alcance de 1 km faz parte dos planos Profissional e Max.")}</p>}
      </>}
      result={<Run gen={gen} error={error} onCancel={cancel} />}
    >
      <div className="card">
        <div className="field">
          <label htmlFor="addr">{t("1. Endereço ou localização")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="addr" type="text" style={{ flex: 1 }} value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void buscar(); } }} placeholder={t("Ex.: Rua Gamboa, Anápolis - GO")} />
            <button type="button" disabled={!address.trim() || buscando} onClick={buscar}>{buscando ? t("Buscando…") : t("Buscar")}</button>
          </div>
          {erroBusca && <p className="alert err" role="alert">{t(erroBusca)}</p>}{mock && <p className="alert err" role="alert">{t("Modo de teste: este servidor está sem a chave do Google Maps, então o satélite e a localização são fictícios.")}</p>}
        </div>

        {centro && (<>
          <label style={{ display: "block", margin: "6px 0" }}>{t("2. Marque o local e o lote no mapa")}</label>
          <MapPicker centro={centro} value={marc} onChange={setMarc} />

          <label style={{ display: "block", margin: "14px 0 6px" }}>{t("3. Dados que vão na prancha")}</label>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div className="field" style={{ gridColumn: "span 2" }}><label htmlFor="f-log">{t("Logradouro")}</label><input id="f-log" style={{ width: "100%" }} value={form.logradouro} onChange={set("logradouro")} maxLength={80} /></div>
            <div className="field"><label htmlFor="f-num">{t("Número")}</label><input id="f-num" style={{ width: "100%" }} value={form.numero} onChange={set("numero")} maxLength={12} placeholder="s/n" /></div>
            <div className="field"><label htmlFor="f-qd">{t("Quadra")}</label><input id="f-qd" style={{ width: "100%" }} value={form.quadra} onChange={set("quadra")} maxLength={10} placeholder="30" /></div>
            <div className="field"><label htmlFor="f-bai">{t("Bairro")}</label><input id="f-bai" style={{ width: "100%" }} value={form.bairro} onChange={set("bairro")} maxLength={60} /></div>
            <div className="field"><label htmlFor="f-cid">{t("Cidade")}</label><input id="f-cid" style={{ width: "100%" }} value={form.cidade} onChange={set("cidade")} maxLength={60} /></div>
            <div className="field"><label htmlFor="f-uf">{t("UF")}</label><input id="f-uf" style={{ width: "100%" }} value={form.uf} onChange={set("uf")} maxLength={2} /></div>
            <div className="field"><label htmlFor="f-cep">{t("CEP")}</label><input id="f-cep" style={{ width: "100%" }} value={form.cep} onChange={set("cep")} maxLength={12} /></div>
          </div>
        </>)}

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "18px 0" }} />
        <Fold title="Prefere enviar o seu próprio print de satélite?" open={adv} onToggle={() => setAdv(!adv)}>
          <ImageInput label="Print de satélite (gera só a vista aérea, sem marcações; substitui o mapa acima)" value={upload} onChange={setUpload} history={false} />
        </Fold>
      </div>
    </ToolShell>
  );
}
