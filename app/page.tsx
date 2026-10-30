import Link from "next/link";
import { currentUser } from "@/lib/auth";
import HouseSplit from "@/components/HouseSplit";
import Logo from "@/components/Logo";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const ETAPAS = [
  ["Mapa de situação", "Digite o endereço e receba o entorno em uma vista aérea realista, fiel às ruas e quadras do satélite. Se preferir, envie o seu próprio print."],
  ["Moodboard", "Escolha o modelo de composição e o ambiente (cozinha, sala, banheiro ou quarto). Cores e materiais saem da casa de referência do seu projeto."],
  ["Render", "Envie o print do modelo 3D e receba quatro versões fotorrealistas. A geometria, as aberturas e o enquadramento do seu modelo são preservados."],
  ["Variação de luz", "Manhã, golden hour, blue hour, noite ou uma luz descrita por você. A casa, a câmera e a composição ficam como estão."],
  ["Filme do projeto", "De uma a cinco cenas (aérea, fachada, acesso, interior, materiais, entardecer) viram um único MP4 Full HD, pronto para apresentar ao cliente."],
];

export default async function Landing() {
  const u = await currentUser();
  const { t } = await getT();
  return (
    <div className="land">
      <div className="in">
        <header className="lnav">
          <Link href="/" className="brand" style={{ padding: 0 }}><Logo />ArqIA</Link>
          <div className="links">
            <a className="txt" href="#etapas">{t("Como funciona")}</a>
            {u ? <Link className="btn" href="/app">{t("Abrir o app")}</Link> : (<>
              <Link className="btn ghost" href="/login">{t("Fazer login")}</Link>
              <Link className="btn" href="/cadastro">{t("Assinar")}</Link>
            </>)}
          </div>
        </header>

        <section className="hero">
          <div className="txt">
            <h1>{t("Do print do 3D ao")} <em>{t("filme do projeto")}</em>.</h1>
            <p className="lead">{t("O ArqIA reúne em um só lugar o fluxo que você faz à mão: mapa de situação, moodboard, render, variações de luz e filme, com a geometria da sua casa como ponto de partida.")}</p>
            <div className="cta">
              <Link className="btn lg" href="/cadastro">{t("Assinar")}</Link>
              <Link className="btn lg ghost" href="/login">{t("Fazer login")}</Link>
            </div>
          </div>
          <div>
            <HouseSplit />
          </div>
        </section>

        <section className="sec" id="etapas">
          <h2>{t("Cinco etapas, uma atrás da outra.")}</h2>
          <p className="sub">{t("Cada resultado alimenta o próximo: o render vira variação de luz, e a variação vira cena do filme.")}</p>
          <ol className="steps">
            {ETAPAS.map(([titulo, d], i) => (
              <li key={titulo}><span className="n">{i + 1}</span><h3>{t(titulo)}</h3><p>{t(d)}</p></li>
            ))}
          </ol>
        </section>

        <section className="sec">
          <h2>{t("Pensado para quem assina o projeto.")}</h2>
          <div className="trio">
            <div><h3>{t("Fiel ao seu projeto")}</h3><p>{t("Você escolhe luz, clima e elementos, e o sistema mantém a geometria do seu modelo.")}</p></div>
            <div><h3>{t("Histórico e download")}</h3><p>{t("Tudo o que você gera fica salvo na sua conta, com download de imagens e do filme em MP4.")}</p></div>
            <div><h3>{t("Créditos com custo à vista")}</h3><p>{t("Cada ferramenta mostra quantos créditos vai consumir antes de gerar, e gerações que falham são estornadas.")}</p></div>
          </div>
        </section>

        <section className="final">
          <h2>{t("Comece pelo mapa de situação.")}</h2>
          <div className="cta">
            <Link className="btn lg" href="/cadastro">{t("Assinar")}</Link>
            <Link className="btn lg ghost" href="/login">{t("Fazer login")}</Link>
          </div>
        </section>

        <footer className="lfoot">
          <span>ArqIA</span>
          <nav className="flinks"><Link href="/termos">{t("Termos de Uso")}</Link><Link href="/privacidade">{t("Política de Privacidade")}</Link></nav>
        </footer>
      </div>
    </div>
  );
}
