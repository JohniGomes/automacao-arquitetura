import { Generation } from "./db";
import { store } from "./store";

const chains = new Map<string, Promise<unknown>>();

/** Grava o estado da geração em ordem (um snapshot por vez por geração), sem bloquear o pipeline. */
export function persist(gen: Generation): Promise<unknown> {
  const snap = structuredClone(gen);
  const next = (chains.get(gen.id) ?? Promise.resolve())
    .then(() => store.saveGen(snap))
    .catch((e) => console.error("persist falhou:", e?.message || e));
  chains.set(gen.id, next);
  next.finally(() => { if (chains.get(gen.id) === next) chains.delete(gen.id); });
  return next;
}
