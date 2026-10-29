import Link from "next/link";
import { currentUser } from "@/lib/auth";
import HouseSplit from "@/components/HouseSplit";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const ETAPAS = [
  ["Mapa de situação", "Digite o endereço e receba o entorno sobre uma vista aérea, com farmácias, mercados, parques, academias e shoppings marcados. Se preferir, envie o seu próprio print."],
  ["Moodboard", "Escolha o modelo de composição e o ambiente (cozinha, sala, banheiro ou quarto). Cores e materiais saem da casa de referência do seu projeto."],
  ["Render", "Envie o print do modelo 3D e receba quatro versões fotorrealistas. O prompt padrão pede para preservar geometria, aberturas e enquadramento, e você pode editá-lo."],
  ["Variação de luz", "Manhã, golden hour, blue hour, noite ou uma luz descrita por você. A casa, a câmera e a composição ficam como estão."],
  ["Filme do projeto", "De uma a cinco cenas (aérea, fachada, acesso, interior, materiais, entardecer) viram um único MP4 Full HD, pronto para apresentar ao cliente."],
];

export default async function Landing() {
  const u = await currentUser();
  return (
    <div className="land">
      <div className="in">
        <header className="lnav">
          <Link href="/" className="brand" style={{ padding: 0 }}><Logo />ArqIA</Link>
          <div className="links">
            <a className="txt" href="#etapas">Como funciona</a>
            {u ? <Link className="btn" href="/app/mapa">Abrir o app</Link> : (<>
              <Link className="btn ghost" href="/login">Fazer login</Link>
              <Link className="btn" href="/cadastro">Assinar</Link>
            </>)}
          </div>
        </header>

        <section className="hero">
          <div className="txt">
            <h1>Do print do 3D ao <em>filme do projeto</em>.</h1>
            <p className="lead">O ArqIA reúne em um só lugar o fluxo que você faz à mão: mapa de situação, moodboard, render, variações de luz e filme, com a geometria da sua casa como ponto de partida.</p>
            <div className="cta">
              <Link className="btn lg" href="/cadastro">Assinar</Link>
              <Link className="btn lg ghost" href="/login">Fazer login</Link>
            </div>
          </div>
          <div>
            <HouseSplit />
          </div>
        </section>

        <section className="sec" id="etapas">
          <h2>Cinco etapas, uma atrás da outra.</h2>
          <p className="sub">Cada resultado alimenta o próximo: o render vira variação de luz, e a variação vira cena do filme.</p>
          <ol className="steps">
            {ETAPAS.map(([t, d], i) => (
              <li key={t}><span className="n">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </section>

        <section className="sec">
          <h2>Pensado para quem assina o projeto.</h2>
          <div className="trio">
            <div><h3>Você controla o prompt</h3><p>Os prompts padrão já preservam a geometria. Edite quando quiser mudar materiais, paisagismo ou clima.</p></div>
            <div><h3>Histórico e download</h3><p>Tudo o que você gera fica salvo na sua conta, com download de imagens e do filme em MP4.</p></div>
            <div><h3>Créditos com custo à vista</h3><p>Cada ferramenta mostra quantos créditos vai consumir antes de gerar, e gerações que falham são estornadas.</p></div>
          </div>
        </section>

        <section className="final">
          <h2>Comece pelo mapa de situação.</h2>
          <div className="cta">
            <Link className="btn lg" href="/cadastro">Assinar</Link>
            <Link className="btn lg ghost" href="/login">Fazer login</Link>
          </div>
        </section>

        <footer className="lfoot">
          <span>ArqIA</span>
          <nav className="flinks"><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Política de Privacidade</Link></nav>
        </footer>
      </div>
    </div>
  );
}
