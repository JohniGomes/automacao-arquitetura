import { requireEmailVerification } from "./mail";
import type { User } from "./db";

/** Conta que ainda precisa confirmar o e-mail (só quando o envio de e-mail está configurado). */
export const needsVerification = (u: Pick<User, "emailVerifiedAt">) => requireEmailVerification() && !u.emailVerifiedAt;
export const VERIFY_MSG = "Confirme seu e-mail para continuar. Enviamos um link para a sua caixa de entrada.";
