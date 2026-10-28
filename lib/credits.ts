import { store } from "./store";

export { COSTS } from "./costs";

/** Débito atômico (no Supabase, função SQL). Retorna false se o saldo não cobre. */
export const charge = (userId: string, amount: number, reason: string, genId?: string) => store.charge(userId, amount, reason, genId);
export async function refund(userId: string, amount: number, reason: string, genId?: string) {
  if (amount > 0) await store.grant(userId, amount, reason, genId);
}
