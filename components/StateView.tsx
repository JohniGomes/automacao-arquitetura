"use client";
import Link from "next/link";
import { useT } from "./I18nProvider";
import Logo from "./Logo";

/** Tela de estado (erro, não encontrado): mesma estrutura em todo o app. */
export default function StateView({ code, title, text, retry, full = false }: { code?: string; title: string; text: string; retry?: () => void; full?: boolean }) {
  const t = useT();
  return (
    <main className={`statepage ${full ? "full" : ""}`}>
      <div className="inner" role="alert">
        <Logo />
        {code && <span className="code">{code}</span>}
        <h1>{t(title)}</h1>
        <p>{t(text)}</p>
        <div className="acts">
          {retry && <button type="button" onClick={retry}>{t("Tentar de novo")}</button>}
          <Link href="/app" className={retry ? "btn ghost" : "btn"}>{t("Ir para o início")}</Link>
        </div>
      </div>
    </main>
  );
}
