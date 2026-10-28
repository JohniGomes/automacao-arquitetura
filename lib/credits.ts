import { db, save, uid, User } from "./db";

export { COSTS } from "./costs";

export function charge(user: User, amount: number, reason: string, genId?: string) {
  if (user.credits < amount) return false;
  user.credits -= amount;
  db().txs.push({ id: uid(), userId: user.id, delta: -amount, reason, genId, at: new Date().toISOString() });
  save();
  return true;
}
export function refund(userId: string, amount: number, reason: string, genId?: string) {
  const u = db().users.find((x) => x.id === userId);
  if (!u || amount <= 0) return;
  u.credits += amount;
  db().txs.push({ id: uid(), userId, delta: amount, reason, genId, at: new Date().toISOString() });
  save();
}
