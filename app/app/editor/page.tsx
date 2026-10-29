"use client";
import { useEffect, useState } from "react";
import { ImageInput, Run, useJob, Val } from "@/components/client";
import EditorCanvas, { buildMask, Region, REGION_COLORS } from "@/components/EditorCanvas";
import { Seg } from "@/components/controls";
import ToolShell from "@/components/ToolShell";
import { MAX_REGIOES } from "@/lib/compose";
import { COSTS_EDICAO } from "@/lib/costs";

function useImageUrl(v: Val) {
  const [u, setU] = useState("");
  useEffect(() => {
    if (v instanceof File) { const o = URL.createObjectURL(v); setU(o); return () => URL.revokeObjectURL(o); }
    setU(typeof v === "string" && v.startsWith("ref:") ? `/api/files/${v.slice(4)}` : "");
  }, [v]);
  return u;
}

export default function Editor() {
  const [base, setBase] = useState<Val>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [tool, setTool] = useState<"rect" | "brush">("rect");
  const [brush, setBrush] = useState(0.03);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [erro, setErro] = useState("");
  const [preparing, setPreparing] = useState(false);
  const url = useImageUrl(base);
  const { gen, error, busy, submit } = useJob();

  const changeBase = (v: Val) => { setBase(v); setRegions([]); setActive(null); };
  const setText = (id: string, text: string) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, text } : r)));
  const remove = (id: string) => { setRegions((rs) => rs.filter((r) => r.id !== id)); setActive((a) => (a === id ? null : a)); };
  const ready = regions.length > 0 && regions.every((r) => r.text.trim());

  async function gerar() {
    setErro("");
    setPreparing(true);
    try {
      const fields: Record<string, Val> = { type: "editor", base };
      for (let i = 0; i < regions.length; i++) {
        const blob = await buildMask(regions[i], size[0], size[1]);
        fields[`mask${i + 1}`] = new File([blob], `mask${i + 1}.png`, { type: "image/png" });
        fields[`text${i + 1}`] = regions[i].text.trim();
      }
      await submit(fields);
    } catch (e: any) {
      setErro(e.message || "Não foi possível preparar as regiões.");
    } finally { setPreparing(false); }
  }

  return (
    <ToolShell
      title="Editar por regiões"
      tip="Beta: o resultado depende do modelo de IA. Marque só o que precisa mudar e descreva em uma frase."
      cost={regions.length * COSTS_EDICAO.editorPorRegiao}
      busy={busy || preparing}
      canGenerate={!!base && ready}
      onGenerate={gerar}
      panel={
        <>
          <Seg label="Ferramenta" value={tool} onChange={setTool} options={[{ v: "rect", label: "Retângulo" }, { v: "brush", label: "Pincel" }]} />
          {tool === "brush" && (
            <div className="field">
              <label htmlFor="bs">Tamanho do pincel</label>
              <input id="bs" type="range" min={0.01} max={0.08} step={0.005} value={brush} onChange={(e) => setBrush(+e.target.value)} />
              <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => setActive(null)}>Nova região</button>
            </div>
          )}
          <div className="field">
            <label>Regiões ({regions.length}/{MAX_REGIOES})</label>
            {regions.length === 0 && <p className="small muted" style={{ margin: 0 }}>Desenhe sobre a imagem e descreva o que mudar em cada região.</p>}
            <div className="regions">
              {regions.map((r, i) => (
                <div key={r.id} className={`region ${active === r.id ? "on" : ""}`} onClick={() => setActive(r.id)}>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <span className="rnum" style={{ background: REGION_COLORS[i % REGION_COLORS.length] }}>{i + 1}</span>
                    <span className="small muted" style={{ margin: 0 }}>{r.kind === "rect" ? "Retângulo" : `Pincel · ${r.strokes.length} ${r.strokes.length === 1 ? "traço" : "traços"}`}</span>
                    <button type="button" className="ghost" aria-label={`Remover região ${i + 1}`} onClick={(e) => { e.stopPropagation(); remove(r.id); }}>Remover</button>
                  </div>
                  <textarea className="short" maxLength={300} value={r.text} onChange={(e) => setText(r.id, e.target.value)} onFocus={() => setActive(r.id)}
                    placeholder="O que mudar aqui? Ex.: trocar o piso por madeira clara" aria-label={`Instrução da região ${i + 1}`} />
                </div>
              ))}
            </div>
            {regions.length > 0 && <button type="button" className="ghost" style={{ marginTop: 10 }} onClick={() => { setRegions([]); setActive(null); }}>Limpar tudo</button>}
          </div>
          {erro && <p className="err small">{erro}</p>}
        </>
      }
      result={<Run gen={gen} error={error} />}
    >
      <div className="card">
        <ImageInput label="Imagem a editar" value={base} onChange={changeBase} showPreview={false} />
        {url && (
          <EditorCanvas src={url} regions={regions} active={active} tool={tool} brush={brush} max={MAX_REGIOES}
            onChange={(rs, a) => { setRegions(rs); setActive(a); }} onSize={(w, h) => setSize([w, h])} />
        )}
      </div>
    </ToolShell>
  );
}
