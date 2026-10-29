import Link from "next/link";
import Logo from "./Logo";
import { LEGAL_DATE } from "@/lib/legal";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="doc">
      <div className="top">
        <Link href="/" className="brand"><Logo />ArqIA</Link>
        <div className="flinks"><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade</Link></div>
      </div>
      <article>
        <h1>{title}</h1>
        <p className="ver">Versão de {LEGAL_DATE}</p>
        {children}
      </article>
    </main>
  );
}
