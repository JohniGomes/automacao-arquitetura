import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/config";
import { PACOTES, PLANOS } from "@/lib/costs";
import { TOOLS, toolById } from "@/lib/tools";
import HouseSplit from "@/components/HouseSplit";
import Icon from "@/components/icons";
import Logo from "@/components/Logo";
import ToolIcon from "@/components/ToolIcon";
import Savings from "@/components/landing/Savings";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const ETAPAS = [
  ["Mapa de situação", "Digite o endereço e receba o entorno em uma vista aérea realista, fiel às ruas e quadras do satélite. Se preferir, envie o seu próprio print."],
  ["Moodboard", "Escolha o modelo de composição e o ambiente (cozinha, sala, banheiro ou quarto). Cores e materiais saem da casa de referência do seu projeto."],
  ["Render", "Envie o print do modelo 3D e receba quatro versões fotorrealistas. A geometria, as aberturas e o enquadramento do seu modelo são preservados."],
  ["Variação de luz", "Manhã, golden hour, blue hour, noite ou uma luz descrita por você. A casa, a câmera e a composição ficam como estão."],
  ["Filme do projeto", "De uma a cinco cenas (aérea, fachada, acesso, interior, materiais, entardecer) viram um único filme MP4 Full HD, com movimento suave de câmera em cada cena, pronto para apresentar ao cliente."],
];

/** Uma frase por ferramenta, em linguagem de escritório (a ordem segue o fluxo do projeto). */
const FERRAMENTAS: [string, string][] = [
  ["mapa", "Vista aérea realista do entorno a partir do endereço do lote."],
  ["moodboard", "Paleta e materiais a partir do render da casa, por ambiente."],
  ["render", "Do print do 3D ao render fotorrealista, com até 4 versões por pedido."],
  ["melhorar", "Refine um render pronto: mais nitidez, textura e realismo."],
  ["esboco", "Transforme um croqui feito à mão em um render realista."],
  ["ideias", "Variações de estilo e de fachada para explorar ideias rápido."],
  ["luz", "Manhã, golden hour, noite ou uma luz descrita por você."],
  ["editor", "Pincele só a região que quer mudar. O resto da imagem fica intacto."],
  ["angulos", "Novos ângulos do mesmo ambiente para uma apresentação completa."],
  ["filme", "Filme animado do projeto, de 1 a 5 cenas em Full HD."],
];

const FAQ: [string, string][] = [
  ["Preciso saber escrever prompts?", "Não. Você escolhe estilo, luz, ambiente e elementos nas opções de cada ferramenta. Há um campo de orientação adicional, mas ele é opcional."],
  ["Funciona com SketchUp, Revit e ArchiCAD?", "Sim. O Croqui trabalha a partir de imagens: envie o print do seu modelo, seja qual for o programa em que ele foi feito."],
  ["A IA altera o meu projeto?", "As ferramentas foram feitas para preservar a geometria e a câmera do seu modelo. Resultados de IA podem ter pequenas variações, então confira cada imagem antes de apresentar ao cliente."],
  ["Como funcionam os créditos?", "Cada geração consome créditos, e o custo aparece antes de você gerar. Se uma geração falhar, os créditos são devolvidos."],
  ["Posso usar as imagens comercialmente?", "Os planos Profissional e Max incluem licença de uso comercial e download sem marca d'água."],
  ["Posso cancelar quando quiser?", "Sim. Os planos são mensais e você cancela a renovação a qualquer momento; o que já foi pago vale até o fim do período."],
  ["Quais são as formas de pagamento?", "Os planos são cobrados no cartão de crédito, com renovação automática. Os créditos avulsos podem ser pagos com Pix ou cartão. O pagamento é processado pelo Asaas."],
  ["Posso baixar os resultados?", "Sim. Cada resultado tem o botão Baixar, e tudo o que você gera fica salvo na sua conta, organizado por projeto."],
];

export default async function Landing() {
  const u = await currentUser();
  const { t } = await getT();
  const bonus = env.signupCredits;
  const start = u ? "/app" : "/cadastro";
  const startLabel = u ? "Abrir o app" : "Começar agora";
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-in lp-navin">
          <Link href="/" className="brand" style={{ padding: 0 }}><Logo />Croqui</Link>
          <nav className="lp-links" aria-label={t("Principal")}>
            <a href="#ferramentas">{t("Ferramentas")}</a>
            <a href="#etapas">{t("Como funciona")}</a>
            <a href="#planos">{t("Planos")}</a>
            <a href="#faq">{t("Perguntas")}</a>
          </nav>
          <div className="lp-acts">
            {!u && <Link className="btn ghost" href="/login">{t("Entrar")}</Link>}
            <Link className="btn" href={start}>{t(startLabel)}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero lp-in">
          <p className="lp-pill">{t("Feito para arquitetos e escritórios de projeto")}</p>
          <h1>{t("Do print do 3D ao")} <em>{t("filme do projeto")}</em>.</h1>
          <p className="lp-lead">{t("Envie o print do seu modelo e receba render fotorrealista, variações de luz, moodboard e um filme animado, sempre mantendo a geometria do seu projeto.")}</p>
          <div className="lp-cta">
            <Link className="btn lg" href={start}>{t(startLabel)}</Link>
            <a className="btn lg ghost" href="#ferramentas">{t("Ver as ferramentas")}</a>
          </div>
          <p className="lp-note">
            {bonus > 0 ? t("Ganhe {n} créditos de boas-vindas ao criar a conta. Sem cartão de crédito.", { n: bonus }) : t("Crie sua conta em menos de um minuto. Sem cartão de crédito.")}
          </p>
          <div className="lp-stage">
            <HouseSplit />
            <svg className="cota" viewBox="0 0 600 22" preserveAspectRatio="none" aria-hidden="true">
              <path d="M1 4v14M599 4v14M1 11h262M337 11h262" stroke="currentColor" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
              <text x="300" y="15" textAnchor="middle">{t("do modelo ao render")}</text>
            </svg>
          </div>
          <p className="lp-compat">{t("Funciona com prints do SketchUp, Revit, ArchiCAD, Rhino e de qualquer outro programa 3D.")}</p>
        </section>

        <section className="lp-facts" aria-label={t("Em números")}>
          <div className="lp-in lp-factgrid">
            <div><b>{TOOLS.length}</b><span>{t("ferramentas em um só lugar")}</span></div>
            <div><b>4</b><span>{t("versões por render, em um pedido")}</span></div>
            <div><b>Full HD</b><span>{t("filme do projeto em 1920×1080")}</span></div>
            <div><b><Icon name="check" /></b><span>{t("créditos devolvidos se a geração falhar")}</span></div>
          </div>
        </section>

        <section className="lp-sec lp-in" id="ferramentas">
          <h2>{t("Tudo para apresentar o projeto")}</h2>
          <p className="lp-sub">{t("Do primeiro croqui ao filme final, sem trocar de programa.")}</p>
          <div className="lp-tools">
            {FERRAMENTAS.map(([id, desc]) => {
              const x = toolById(id);
              return x ? (
                <div key={id} className="lp-tool">
                  <ToolIcon tool={x} size={44} />
                  <h3>{t(x.label)}</h3>
                  <p>{t(desc)}</p>
                </div>
              ) : null;
            })}
          </div>
        </section>

        <svg className="regua" aria-hidden="true"><defs><pattern id="rg" width="10" height="16" patternUnits="userSpaceOnUse"><path d="M.5 10v6" stroke="currentColor" strokeWidth="1" /><path d="M5.5 13v3" stroke="currentColor" strokeWidth="1" /></pattern></defs><rect width="100%" height="16" fill="url(#rg)" /></svg>

        <section className="lp-sec lp-in" id="etapas">
          <h2>{t("Cinco etapas, uma atrás da outra.")}</h2>
          <p className="lp-sub">{t("Cada resultado alimenta o próximo: o render vira variação de luz, e a variação vira cena do filme.")}</p>
          <ol className="lp-steps">
            {ETAPAS.map(([titulo, d], i) => (
              <li key={titulo}><span className="n">{i + 1}</span><h3>{t(titulo)}</h3><p>{t(d)}</p></li>
            ))}
          </ol>
        </section>

        <section className="lp-sec lp-alt">
          <div className="lp-in">
            <h2>{t("Quanto você economiza?")}</h2>
            <p className="lp-sub">{t("Compare o que você paga hoje por render com um plano do Croqui. Ajuste os números ao seu caso.")}</p>
            <Savings />
          </div>
        </section>

        <section className="lp-sec lp-in" id="planos">
          <h2>{t("Escolha seu plano")}</h2>
          <p className="lp-sub">{t("Planos mensais, pagos no cartão de crédito, com renovação automática. Cancele quando quiser.")}</p>
          <div className="lp-plans">
            {PLANOS.map((p) => (
              <div key={p.id} className={`lp-plan ${p.destaque ? "feat" : ""}`}>
                {p.destaque && <span className="lp-badge">{t("mais escolhido")}</span>}
                <h3>{t(p.nome)}</h3>
                <p className="lp-price"><b>{brl(p.preco)}</b><span>/{t("mês")}</span></p>
                <p className="lp-credits">{p.creditosMes.toLocaleString("pt-BR")} {t("créditos por mês")}</p>
                <p className="lp-renders">{t("até {n} renders rápidos por mês", { n: Math.floor(p.creditosMes / 4).toLocaleString("pt-BR") })}</p>
                <ul>{p.itens.map((i) => <li key={i}><Icon name="check" />{t(i)}</li>)}</ul>
                <Link className={`btn ${p.destaque ? "" : "ghost"}`} href={u ? "/app/creditos" : "/cadastro"}>{t("Assinar")}</Link>
              </div>
            ))}
          </div>
          <div className="lp-packs">
            <div><h3>{t("Precisa só de alguns créditos?")}</h3><p>{t("Créditos avulsos: Pix ou cartão, sem assinatura.")}</p></div>
            <ul>
              {PACOTES.map((p) => <li key={p.id}><b>{p.creditos}</b> {t("créditos")} <span>{brl(p.preco)}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="lp-sec lp-in" id="faq">
          <h2>{t("Perguntas frequentes")}</h2>
          <div className="lp-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{t(q)}</summary><p>{t(a)}</p></details>
            ))}
          </div>
          <p className="lp-sub lp-more">{t("Não achou sua dúvida? Fale com o suporte dentro do app.")}</p>
        </section>

        <section className="lp-in">
          <div className="lp-final">
            <h2>{t("Leve o próximo projeto do print ao filme.")}</h2>
            <div className="lp-cta">
              <Link className="btn lg" href={start}>{t(startLabel)}</Link>
              {!u && <Link className="btn lg ghost" href="/login">{t("Fazer login")}</Link>}
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot lp-in">
        <span className="brand" style={{ padding: 0 }}><Logo />Croqui</span>
        <nav className="flinks"><Link href="/termos">{t("Termos de Uso")}</Link><Link href="/privacidade">{t("Política de Privacidade")}</Link></nav>
      </footer>
    </div>
  );
}
