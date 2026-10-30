"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "./I18nProvider";

type QA = { q: string; a: string };
type Section = { title: string; items: QA[] };

const SECTIONS: Section[] = [
  { title: "Primeiros passos", items: [
    { q: "O que é o ArqIA?", a: "O ArqIA é um conjunto de ferramentas de IA para arquitetos: gera render, moodboard, variações de luz, mapa de situação e filme do projeto a partir das suas imagens." },
    { q: "Como funcionam os créditos?", a: "Cada geração consome créditos. O custo aparece em tempo real no painel, antes de você gerar. Se uma geração falhar, os créditos são devolvidos." },
    { q: "A IA altera o meu projeto?", a: "As ferramentas foram feitas para preservar a geometria e a câmera do seu modelo. Resultados de IA podem ter pequenas variações, então confira cada imagem antes de apresentar ao cliente." },
  ] },
  { title: "Ferramentas", items: [
    { q: "Como faço um render?", a: "Em Ferramentas > Render, envie o print do modelo 3D, escolha o estilo, a luz e os elementos desejados e clique em Gerar. Use um print nítido, com câmera ampla e materiais já aplicados." },
    { q: "Como funciona o moodboard?", a: "Você envia o render da casa e escolhe um modelo da galeria (ou envia o seu) e o ambiente. O layout do modelo é reproduzido, e as cores e os materiais vêm do render da casa." },
    { q: "O que é o filme do projeto?", a: "Cada cena gera uma imagem e um clipe de vídeo, e o filme final é montado em 1920x1080. O filme é liberado para quem tem plano ou já comprou créditos." },
    { q: "Como edito só uma parte da imagem?", a: "Em Editar por regiões, pinte a área que quer mudar, escreva a instrução e gere. O que está fora da região pintada permanece igual." },
    { q: "Como vejo o projeto por outro ângulo?", a: "Em Multi-ângulo, gire a câmera no disco ou escolha ângulos prontos. É possível gerar um mosaico com vários ângulos de uma vez." },
  ] },
  { title: "Conta e cobrança", items: [
    { q: "Como compro créditos ou assino um plano?", a: "Abra Créditos no menu. A cobrança online ainda está sendo preparada; enquanto isso, fale com o suporte para contratar." },
    { q: "Posso baixar meus resultados?", a: "Sim. Cada resultado tem o botão Baixar, e todas as suas gerações ficam em Gerações, organizadas por projeto." },
    { q: "Como falo com o suporte?", a: "Use o botão Suporte no menu: descreva o que precisa e a mensagem chega à nossa equipe." },
  ] },
];

export default function HelpView() {
  const t = useT();
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const n = norm(q.trim());
  return (
    <>
      <h1>{t("Ajuda")}</h1>
      <p className="muted">{t("Explore os artigos e as perguntas frequentes.")}</p>
      <div className="row gap helplinks">
        <Link href="/app/suporte" className="btn ghost">{t("Falar com o suporte")}</Link>
      </div>
      <div className="field"><input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Buscar ajuda…")} aria-label={t("Buscar ajuda…")} /></div>
      {SECTIONS.map((s) => {
        const items = s.items.filter((i) => !n || norm(t(i.q) + " " + t(i.a)).includes(n));
        return items.length ? (
          <section key={s.title}>
            <h2 style={{ margin: "22px 0 10px" }}>{t(s.title)}</h2>
            {items.map((i) => (
              <details key={i.q} className="faq">
                <summary>{t(i.q)}</summary>
                <p>{t(i.a)}</p>
              </details>
            ))}
          </section>
        ) : null;
      })}
      {n && SECTIONS.every((s) => !s.items.some((i) => norm(t(i.q) + " " + t(i.a)).includes(n))) && <p className="muted">{t("Nada encontrado. Fale com o suporte.")}</p>}
    </>
  );
}
