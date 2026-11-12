import { env } from "./config";
import { store } from "./store";
import { checkToken, peekToken } from "./tokens";

/** Confirma o e-mail pelo link; na primeira confirmação de conta criada sem créditos, libera os créditos de boas-vindas. */
export async function confirmEmailToken(token: string): Promise<boolean> {
  const p = peekToken(token);
  if (p?.purpose !== "verify") return false;
  const u = await store.getUser(p.userId);
  if (!u || checkToken(token, "verify", u.email) !== u.id) return false;
  if ((await store.markEmailVerified(u.id)) && env.signupCredits > 0) await store.grant(u.id, env.signupCredits, "Créditos de boas-vindas");
  return true;
}
