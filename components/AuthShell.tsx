import { cookies } from "next/headers";
import AuthBackdrop from "./AuthBackdrop";
import { FUNDO_COOKIE, fundoValido } from "@/lib/acesso";

/** Tela inteira com a foto de fundo e, por cima, o cartão. */
export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const initial = fundoValido((await cookies()).get(FUNDO_COOKIE)?.value);
  return (
    <main className="auth">
      <AuthBackdrop initial={initial} />
      <div className="formside">{children}</div>
    </main>
  );
}
