import { COSTS } from "../costs";
import { LatLon, polygonStats, projector, selfIntersects } from "./geo";

/** Lê e valida o pedido do mapa de situação (formulário multipart do /api/jobs). Lança Error com mensagem para o usuário. */
export type LimitesMapa = { alcanceMapaM: number; lugaresAerea: number; pranchaSvg: boolean; pranchaDxf: boolean };

export function lerPedidoSituacao(form: FormData, limites: LimitesMapa) {
  const str = (k: string) => String(form.get(k) || "").trim();
  const modo = str("modo");
  if (modo !== "prancha" && modo !== "aerea" && modo !== "ambos") throw new Error("Escolha o que gerar: a prancha, a vista aérea ou as duas.");

  let bruto: unknown;
  try { bruto = JSON.parse(str("polygon")); } catch { bruto = null; }
  if (!Array.isArray(bruto) || bruto.length < 3 || bruto.length > 40) throw new Error("Marque o lote no mapa com pelo menos 3 pontos.");
  const polygon: LatLon[] = bruto.map((p) => {
    const la = Number(p?.[0]), lo = Number(p?.[1]);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 85 || Math.abs(lo) > 180) throw new Error("Os pontos do lote são inválidos.");
    return [Math.round(la * 1e6) / 1e6, Math.round(lo * 1e6) / 1e6] as LatLon;
  });
  const pj = projector(polygon[0][0], polygon[0][1]);
  const m = polygon.map(([la, lo]) => pj.toM(la, lo));
  const { area } = polygonStats(m);
  if (area < 15) throw new Error("O lote marcado ficou pequeno demais. Afaste os pontos.");
  if (area > 3_000_000) throw new Error("O lote marcado é grande demais para um mapa de situação (mais de 300 hectares).");
  if (selfIntersects(m)) throw new Error("Os lados do lote se cruzam. Ajuste os pontos para formar uma figura simples.");

  const raio = [300, 600, 1000].includes(Number(str("raio"))) ? Number(str("raio")) : 600;
  if (raio > limites.alcanceMapaM) throw new Error("O alcance de 1 km faz parte dos planos Profissional e Max. Escolha 300 ou 600 m.");
  const endereco = {
    logradouro: str("logradouro").slice(0, 80), numero: str("numero").slice(0, 12), quadra: str("quadra").slice(0, 10),
    bairro: str("bairro").slice(0, 60), cidade: str("cidade").slice(0, 60), uf: str("uf").slice(0, 2).toUpperCase(), cep: str("cep").slice(0, 12),
  };
  const cost = modo === "ambos" ? COSTS.mapaAmbos : modo === "prancha" ? COSTS.mapaPrancha : COSTS.mapa;
  const rotulo = { prancha: "prancha", aerea: "vista aérea", ambos: "prancha e vista aérea" }[modo];
  const onde = [endereco.logradouro || "lote marcado", endereco.quadra ? `Qd. ${endereco.quadra}` : ""].filter(Boolean).join(", ");
  return { params: { modo, polygon, raio, endereco, maxLugares: limites.lugaresAerea, vetor: limites.pranchaSvg, dxf: limites.pranchaDxf }, cost, summary: `Mapa de situação — ${onde} (${rotulo})` };
}
