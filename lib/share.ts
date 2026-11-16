import type { Escritorio, Share } from "./db";
import { store } from "./store";

/**
 * O que um link público de apresentação mostra: as imagens e vídeos prontos do projeto (sem as entradas das ferramentas) e a marca
 * do escritório. O conjunto de arquivos liberados sai daqui para a página e para a rota dos arquivos, então só o que aparece na
 * página pode ser aberto pelo link.
 */
export type ItemPublico = { file: string; kind: "image" | "video"; label: string };
export type DadosPublicos = { projeto: string; itens: ItemPublico[]; escritorio: Escritorio | null; arquivos: Set<string> };

export async function dadosDoLink(share: Share): Promise<DadosPublicos | null> {
  const projeto = await store.getProject(share.projectId, share.userId);
  if (!projeto) return null;
  const gens = (await store.listGens(share.userId)).filter((g) => g.projectId === share.projectId && g.status === "done");
  const itens: ItemPublico[] = [];
  for (const g of gens) {
    for (const o of g.outputs) {
      // fora da página: arquivos de entrada, DXF e o SVG da prancha (que repete o PNG)
      if ((o.kind !== "image" && o.kind !== "video") || o.label?.includes("entrada") || /\.svg$/i.test(o.file)) continue;
      itens.push({ file: o.file, kind: o.kind, label: o.label || g.summary });
    }
  }
  const escritorio = await store.getOffice(share.userId).catch(() => null);
  const limitados = itens.slice(0, 60);
  const arquivos = new Set(limitados.map((i) => i.file));
  if (escritorio?.logo) arquivos.add(escritorio.logo);
  return { projeto: projeto.name, itens: limitados, escritorio, arquivos };
}
