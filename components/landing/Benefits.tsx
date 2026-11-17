"use client";
import { useState } from "react";
import HouseSplit from "../HouseSplit";
import Icon, { IconName } from "../icons";
import ToolIcon from "../ToolIcon";
import { useT } from "../I18nProvider";
import { TOOLS } from "@/lib/tools";

const ITENS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "cloud", titulo: "Acesse de qualquer lugar", texto: "O Croqui roda na nuvem, direto no navegador. Você não precisa de um computador potente: use no celular ou no computador e, se quiser, instale na tela inicial." },
  { icon: "tools", titulo: "Funcionalidades que importam", texto: "Dez ferramentas para cada etapa do projeto: do mapa de situação ao filme, passando por moodboard, render, variações de luz e edição por região." },
  { icon: "bolt", titulo: "Resultados rápidos", texto: "Envie o print do seu modelo e receba renders fotorrealistas, com até 4 versões por pedido, sem esperar o processamento do seu computador." },
];

/** Benefícios em abas: a lista à esquerda e, à direita, a imagem que ilustra o item escolhido. */
export default function Benefits() {
  const t = useT();
  const [a, setA] = useState(0);
  return (
    <div className="lp-ben">
      <div className="lp-benlist" role="tablist" aria-label={t("Benefícios")}>
        {ITENS.map((x, i) => (
          <button key={x.titulo} type="button" role="tab" aria-selected={a === i} className={a === i ? "on" : ""} onClick={() => setA(i)}>
            <span className="h"><Icon name={x.icon} />{t(x.titulo)}</span>
            <span className="p">{t(x.texto)}</span>
          </button>
        ))}
      </div>
      <div className="lp-benvis" role="tabpanel">
        {a === 0 && (
          <div className="lp-devices">
            <img className="d" src="/landing/app-desktop.jpg" width={800} height={508} alt={t("O Croqui no computador")} loading="lazy" />
            <img className="m" src="/landing/app-mobile.jpg" width={780} height={1388} alt={t("O Croqui no celular")} loading="lazy" />
          </div>
        )}
        {a === 1 && (
          <div className="lp-toolgrid">
            {TOOLS.map((x) => <div key={x.id}><ToolIcon tool={x} size={44} /><span>{t(x.label)}</span></div>)}
          </div>
        )}
        {a === 2 && <HouseSplit />}
      </div>
    </div>
  );
}
