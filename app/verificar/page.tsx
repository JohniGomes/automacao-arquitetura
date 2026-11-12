import Link from "next/link";
import { confirmEmailToken } from "@/lib/verifyEmail";
import { getT } from "@/lib/i18n-server";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function Verificar({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getT();
  const ok = token ? await confirmEmailToken(token).catch(() => false) : false;
  return (
    <main className="auth" style={{ display: "block" }}>
      <div className="formside" style={{ minHeight: "100vh" }}>
        <div className="box">
          <Link href="/" className="brand"><Logo />Croqui</Link>
          <h1>{ok ? t("E-mail confirmado") : t("Link inválido")}</h1>
          <p className="muted">{ok ? t("Tudo certo! Sua conta está liberada e os créditos de boas-vindas já estão disponíveis.") : t("Este link de confirmação é inválido ou expirou. Entre na sua conta e peça um novo.")}</p>
          <p style={{ marginTop: 20 }}><Link className="btn full" href="/app">{t("Ir para o app")}</Link></p>
        </div>
      </div>
    </main>
  );
}
