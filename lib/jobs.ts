import { Generation } from "./db";
import { refund } from "./credits";
import { persist } from "./persist";
import { store } from "./store";
import { JobInput, runPipeline } from "./pipelines";
import { userMessage } from "./errors";

/** Fila em memória (um processo). Para escalar, trocar por BullMQ/Redis ou worker separado — ver README. */
const MAX = 2;
/** tempo máximo de um job: depois disso ele é encerrado com erro e estornado, para não prender uma vaga da fila */
const JOB_TIMEOUT = { filme: 35 * 60_000, default: 12 * 60_000 } as const;
/** jobs ativos (na fila ou rodando) por usuário */
export const MAX_ACTIVE_PER_USER = 3;
const g = globalThis as unknown as {
  __q?: { running: number; waiting: (() => Promise<void>)[] };
  __live?: Map<string, Generation>;
  __rec?: Promise<void>;
  __refunded?: Set<string>;
};
const q = (g.__q ??= { running: 0, waiting: [] });
/** gerações em andamento neste processo (progresso mais fresco que o banco) */
export const live = (g.__live ??= new Map<string, Generation>());
/** gerações já estornadas neste processo: o estorno total acontece no máximo uma vez por geração */
const refunded = (g.__refunded ??= new Set<string>());

export const activeJobs = (userId: string) => [...live.values()].filter((x) => x.userId === userId && (x.status === "queued" || x.status === "running")).length;

/** Estorno do que ainda não foi devolvido, uma vez só. */
async function refundRest(gen: Generation, reason: string) {
  if (refunded.has(gen.id)) return;
  refunded.add(gen.id);
  const rest = gen.cost - (gen.refunded || 0);
  try { await refund(gen.userId, rest, reason, gen.id); }
  catch (e) { refunded.delete(gen.id); throw e; }
}

/** Ao reiniciar, jobs que estavam em andamento morreram: devolve os créditos e só então marca como erro (se o estorno falhar, tenta de novo na próxima vez). */
export function recoverStale(): Promise<void> {
  return (g.__rec ??= (async () => {
    for (const gen of await store.staleGens()) {
      if (live.has(gen.id)) continue;
      // jobs de outra instância podem estar vivos: só recupera o que ficou parado por mais de 20 minutos
      if (gen.createdAt && Date.now() - new Date(gen.createdAt).getTime() < 20 * 60_000) continue;
      await refundRest(gen, "Estorno: geração interrompida");
      gen.status = "error";
      gen.error = "Interrompido por reinício do servidor. Créditos devolvidos.";
      gen.finishedAt = new Date().toISOString();
      await store.saveGen(gen);
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

const timeoutAfter = (ms: number) => new Promise<never>((_, rej) => { const t = setTimeout(() => rej(new Error("Tempo máximo da geração excedido.")), ms); t.unref?.(); });

export function enqueue(gen: Generation, input: JobInput) {
  live.set(gen.id, gen);
  q.waiting.push(async () => {
    gen.status = "running";
    gen.message = "Iniciando…";
    void persist(gen);
    try {
      await Promise.race([runPipeline(gen, input), timeoutAfter(gen.type === "filme" ? JOB_TIMEOUT.filme : JOB_TIMEOUT.default)]);
      gen.status = "done";
      gen.progress = 100;
      if (!/falharam|^Concluído\./.test(gen.message)) gen.message = "Concluído";
    } catch (e: any) {
      // o detalhe técnico fica só no log do servidor; o usuário recebe uma mensagem segura
      console.error(`geração ${gen.id} (${gen.type}) falhou:`, e?.message || e);
      gen.status = "error";
      gen.error = userMessage(e);
      // estorno integral só quando nada utilizável saiu
      if (!gen.outputs.some((o) => o.label && !o.label.includes("entrada"))) {
        await refundRest(gen, "Estorno: geração falhou").catch((er) => console.error("estorno falhou:", er));
        gen.message = "Falhou — créditos devolvidos";
      } else gen.message = "Falhou parcialmente";
    }
    gen.finishedAt = new Date().toISOString();
    await persist(gen);
    live.delete(gen.id);
  });
  pump();
}
