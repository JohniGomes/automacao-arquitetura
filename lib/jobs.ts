import { Generation } from "./db";
import { refund } from "./credits";
import { persist } from "./persist";
import { store } from "./store";
import { JobInput, runPipeline } from "./pipelines";

/** Fila em memória (um processo). Para escalar, trocar por BullMQ/Redis ou worker separado — ver README. */
const MAX = 2;
const g = globalThis as unknown as {
  __q?: { running: number; waiting: (() => Promise<void>)[] };
  __live?: Map<string, Generation>;
  __rec?: Promise<void>;
};
const q = (g.__q ??= { running: 0, waiting: [] });
/** gerações em andamento neste processo (progresso mais fresco que o banco) */
export const live = (g.__live ??= new Map<string, Generation>());

/** Ao reiniciar, jobs que estavam em andamento morreram: marca como erro e devolve os créditos. */
export function recoverStale(): Promise<void> {
  return (g.__rec ??= (async () => {
    for (const gen of await store.staleGens()) {
      if (live.has(gen.id)) continue;
      gen.status = "error";
      gen.error = "Interrompido por reinício do servidor. Créditos devolvidos.";
      gen.finishedAt = new Date().toISOString();
      await store.saveGen(gen);
      await refund(gen.userId, gen.cost, "Estorno: geração interrompida", gen.id);
    }
  })().catch((e) => { console.error("recoverStale:", e); g.__rec = undefined; }));
}

function pump() {
  while (q.running < MAX && q.waiting.length) {
    const job = q.waiting.shift()!;
    q.running++;
    job().finally(() => { q.running--; pump(); });
  }
}

export function enqueue(gen: Generation, input: JobInput) {
  live.set(gen.id, gen);
  q.waiting.push(async () => {
    gen.status = "running";
    gen.message = "Iniciando…";
    void persist(gen);
    try {
      await runPipeline(gen, input);
      gen.status = "done";
      gen.progress = 100;
      if (!/falharam|Concluído./.test(gen.message)) gen.message = "Concluído";
    } catch (e: any) {
      gen.status = "error";
      gen.error = String(e?.message || e);
      // estorno integral só quando nada utilizável saiu
      if (!gen.outputs.some((o) => o.label && !o.label.includes("entrada"))) {
        await refund(gen.userId, gen.cost, "Estorno: geração falhou", gen.id).catch((er) => console.error("estorno falhou:", er));
        gen.message = "Falhou — créditos devolvidos";
      } else gen.message = "Falhou parcialmente";
    }
    gen.finishedAt = new Date().toISOString();
    await persist(gen);
    live.delete(gen.id);
  });
  pump();
}
