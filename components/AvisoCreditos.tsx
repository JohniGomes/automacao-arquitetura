"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Mascote from "./Mascote";
import { useT } from "./I18nProvider";
import { useCredits } from "./useCredits";
import { nivelSaldo } from "@/lib/saldo";

const CHAVE = "croqui.aviso-baixo";
/** Telas em que o aviso só atrapalharia (a própria compra). */
const SEM_AVISO = ["/app/creditos", "/app/pagar"];

/**
 * Faixa no topo do conteúdo quando os créditos estão acabando (o Cro fica preocupado) ou acabaram (o Cro fica triste).
 * O aviso de "acabando" pode ser dispensado até a próxima visita; o de "acabaram" fica enquanto não houver saldo.
 */
export default function AvisoCreditos({ creditos, limite }: { creditos: number; limite: number }) {
  const t = useT();
  const path = usePathname();
  const c = useCredits(creditos);
  const [dispensado, setDispensado] = useState(true);
  useEffect(() => { try { setDispensado(sessionStorage.getItem(CHAVE) === "1"); } catch { setDispensado(false); } }, []);
  if (c == null || SEM_AVISO.some((p) => path.startsWith(p))) return null;
  const nivel = nivelSaldo(c, limite);
  if (nivel === "ok" || (nivel === "baixo" && dispensado)) return null;
  const acabou = nivel === "acabou";
  return (
    <div className={`aviso-saldo ${acabou ? "acabou" : "baixo"}`} role={acabou ? "alert" : "status"}>
      <Mascote humor={acabou ? "triste" : "preocupado"} size={52} />
      <div className="as-txt">
        <strong>{acabou ? t("Seus créditos acabaram") : t("Seus créditos estão acabando")}</strong>
        <span>{acabou ? t("Com o saldo atual não dá para gerar. Compre créditos ou escolha um plano para continuar.") : t("Restam {n} créditos. Garanta mais antes de acabar.", { n: c })}</span>
      </div>
      <Link href="/app/creditos" className="btn">{acabou ? t("Ver planos e créditos") : t("Comprar créditos")}</Link>
      {!acabou && <button type="button" className="ghost as-x" aria-label={t("Dispensar")} onClick={() => { try { sessionStorage.setItem(CHAVE, "1"); } catch { /* ok */ } setDispensado(true); }}>✕</button>}
    </div>
  );
}
