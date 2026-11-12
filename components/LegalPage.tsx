import Link from "next/link";
import Logo from "./Logo";
import { LEGAL_DATE, LEGAL_DATE_EN } from "@/lib/legal";
import { getT } from "@/lib/i18n-server";

export default async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const { t, lang } = await getT();
  return (
    <main className="doc">
      <div className="top">
        <Link href="/" className="brand"><Logo />Croqui</Link>
        <div className="flinks"><Link href="/termos">{t("Termos de Uso")}</Link><Link href="/privacidade">{t("Privacidade")}</Link></div>
      </div>
      <article>
        <h1>{t(title)}</h1>
        <p className="ver">{t("Versão de")} {lang === "en" ? LEGAL_DATE_EN : LEGAL_DATE}</p>
        {children}
      </article>
    </main>
  );
}
