"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "./I18nProvider";

/** No celular, Projetos e Gerações dividem uma aba da barra inferior; estes botões alternam entre os dois. */
export default function SectionTabs() {
  const path = usePathname();
  const t = useT();
  const items = [{ href: "/app/projetos", label: "Projetos" }, { href: "/app/geracoes", label: "Gerações" }];
  return (
    <nav className="sectiontabs" aria-label={t("Seção")}>
      {items.map((x) => {
        const on = x.href === "/app/geracoes" ? path.startsWith("/app/geracoes") : !path.startsWith("/app/geracoes");
        return <Link key={x.href} href={x.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{t(x.label)}</Link>;
      })}
    </nav>
  );
}
