import { db, Generation, save } from "./db";
import { refund } from "./credits";
import { JobInput, runPipeline } from "./pipelines";

/** Fila em memória (um processo). Para produção, trocar por BullMQ/Redis ou similar — ver README. */
const MAX = 2;
const g = globalThis as unknown as { __q?: { running: number; waiting: (() => Promise<void>)[] } };
const q = (g.__q ??= { running: 0, waiting: [] });

// Ao reiniciar, jobs que estavam em andamento morreram: marca como erro e devolve os créditos.
const g2 = globalThis as unknown as { __recovered?: boolean };
export function recoverStale() {
  if (g2.__recovered) return;
  g2.__recovered = true;
  for (const gen of db().generations) {
    if (gen.status === "queued" || gen.status === "running") {
      gen.status = "error";
      gen.error = "Interrompido por reinício do servidor. Créditos devolvidos.";
      refund(gen.userId, gen.cost, "Estorno: geração interrompida", gen.id);
    }
  }
  save();
}

function pump() {
  while (q.running < MAX && q.waiting.length) {
    const job = q.waiting.shift()!;
    q.running++;
    job().finally(() => { q.running--; pump(); });
  }
}

export function enqueue(gen: Generation, input: JobInput) {
  q.waiting.push(async () => {
    gen.status = "running";
    gen.message = "Iniciando…";
    save();
    try {
      await runPipeline(gen, input);
      gen.status = "done";
      gen.progress = 100;
      if (!gen.message.includes("falharam")) gen.message = "Concluído";
    } catch (e: any) {
      gen.status = "error";
      gen.error = String(e?.message || e);
      // devolve tudo se nada saiu; senão devolve proporcionalmente não é trivial -> estorno integral só se sem saída
      if (!gen.outputs.some((o) => o.label && !o.label.includes("entrada"))) {
        refund(gen.userId, gen.cost, "Estorno: geração falhou", gen.id);
        gen.message = "Falhou — créditos devolvidos";
      } else gen.message = "Falhou parcialmente";
    }
    gen.finishedAt = new Date().toISOString();
    save();
  });
  pump();
}
