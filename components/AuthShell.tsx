import { cookies } from "next/headers";
import AuthBackdrop from "./AuthBackdrop";
import Reveal from "./anim/Reveal";
import { FUNDO_COOKIE, fundoValido } from "@/lib/acesso";

/** Tela inteira com a foto de fundo e, por cima, o cartão. */
export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const initial = fundoValido((await cookies()).get(FUNDO_COOKIE)?.value);
  return (
    <main className="auth">
      <AuthBackdrop initial={initial} />
      <div className="formside"><Reveal mount distance={30} duration={0.7} style={{ width: "100%", display: "flex", justifyContent: "center" }}>{children}</Reveal></div>
    </main>
  );
}
