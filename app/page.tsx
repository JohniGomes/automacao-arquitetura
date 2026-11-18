import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/config";
import { COSTS, PACOTES, PLANOS } from "@/lib/costs";
import { toolById } from "@/lib/tools";
import HouseSplit from "@/components/HouseSplit";
import Icon, { IconName } from "@/components/icons";
import Logo from "@/components/Logo";
import ToolGlyph from "@/components/landing/ToolGlyph";
import Benefits from "@/components/landing/Benefits";
import Nav from "@/components/landing/Nav";
import Savings from "@/components/landing/Savings";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

const ETAPAS = [
  ["Mapa de situação", "Digite o endereço e receba o entorno em uma vista aérea realista, fiel às ruas e quadras do satélite. Se preferir, envie o seu próprio print."],
  ["Moodboard", "Escolha o modelo de composição e o ambiente (cozinha, sala, banheiro ou quarto). Cores e materiais saem da casa de referência do seu projeto."],
  ["Render", "Envie o print do modelo 3D e receba quatro versões fotorrealistas. A geometria, as aberturas e o enquadramento do seu modelo são preservados."],
  ["Variação de luz", "Manhã, golden hour, blue hour, noite ou uma luz descrita por você. A casa, a câmera e a composição ficam como estão."],
  ["Filme do projeto", "De uma a cinco cenas (aérea, fachada, acesso, interior, materiais, entardecer) viram um único filme MP4 Full HD, com movimento suave de câmera em cada cena, pronto para apresentar ao cliente."],
];

/** Uma frase por ferramenta, em linguagem de escritório (a ordem segue o fluxo do projeto). */
const FERRAMENTAS: [string, string][] = [
  ["mapa", "Prancha técnica e vista aérea ilustrativa do entorno, a partir do endereço."],
  ["moodboard", "Paleta e materiais a partir do render da casa, por ambiente."],
  ["render", "Do print do 3D ao render fotorrealista, com até 4 versões por pedido."],
  ["melhorar", "Refine um render pronto: mais nitidez, textura e realismo."],
  ["esboco", "Transforme um croqui feito à mão em um render realista."],
  ["ideias", "Variações de estilo e de fachada para explorar ideias rápido."],
  ["luz", "Manhã, golden hour, noite ou uma luz descrita por você."],
  ["editor", "Pincele só a região que quer mudar. O resto da imagem fica intacto."],
  ["angulos", "Novos ângulos do mesmo ambiente para uma apresentação completa."],
  ["filme", "Filme animado do projeto em Full HD, de 1 a 3 cenas (até 5 no plano Max)."],
];

const PARA_QUEM: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "school", titulo: "Estudantes e entusiastas", texto: "Tire suas ideias do papel e apresente projetos acadêmicos com imagens de alto nível, sem montar uma estação de render." },
  { icon: "building", titulo: "Escritórios de arquitetura", texto: "Padronize as apresentações da equipe e entregue ao cliente render, variações de luz e filme sem depender de máquinas caras." },
  { icon: "laptop", titulo: "Profissionais autônomos", texto: "Aproveite as ferramentas para criar e simular o ambiente ideal para os seus clientes, direto do celular ou do computador." },
];

type Faq = [string, string, Record<string, string | number>?];

export default async function Landing() {
  const u = await currentUser();
  const { t } = await getT();
  // a oferta da landing vem do que a conta realmente recebe (SIGNUP_CREDITS), em renders inteiros
  const bonus = Math.floor(env.signupCredits / COSTS.renderPorImagem);
  const start = u ? "/app" : "/cadastro";
  const startLabel = u ? "Abrir o app" : "Criar conta grátis";
  const temVideo = fs.existsSync(path.join(process.cwd(), "public", "demo", "croqui.mp4"));
  const precos = PLANOS.map((p) => p.preco);
  const faq: Faq[] = [
    ["O que é o Croqui?", "O Croqui é uma plataforma de IA para arquitetos: gera render, moodboard, variações de luz, mapa de situação e filme do projeto a partir das suas imagens."],
    ["Preciso de um computador potente?", "Não. O processamento acontece na nuvem: basta um navegador, no computador ou no celular."],
    ["O Croqui tem teste grátis?", bonus > 0 ? "Sim. Ao criar a conta você ganha renders grátis para testar, sem cartão de crédito." : "Criar a conta é grátis e não pede cartão de crédito. Você paga só pelos créditos que usar."],
    ["Quanto custa?", "Os planos mensais vão de {a} a {b} por mês. Também há créditos avulsos a partir de {c}.", { a: brl(Math.min(...precos)), b: brl(Math.max(...precos)), c: brl(Math.min(...PACOTES.map((p) => p.preco))) }],
    ["Funciona com SketchUp, Revit e ArchiCAD?", "Sim. O Croqui trabalha a partir de imagens: envie o print do seu modelo, seja qual for o programa em que ele foi feito."],
    ["Preciso saber escrever prompts?", "Não. Você escolhe estilo, luz, ambiente e elementos nas opções de cada ferramenta. Há um campo de orientação adicional, mas ele é opcional."],
    ["A IA altera o meu projeto?", "As ferramentas foram feitas para preservar a geometria e a câmera do seu modelo. Resultados de IA podem ter pequenas variações, então confira cada imagem antes de apresentar ao cliente."],
    ["Como funcionam os créditos?", "Cada geração consome créditos, e o custo aparece antes de você gerar. Se uma geração falhar, os créditos são devolvidos."],
    ["Os créditos expiram?", "Os créditos do plano valem no mês: o que sobrar expira na renovação. Os créditos avulsos e os de boas-vindas não expiram."],
    ["Posso usar as imagens comercialmente?", "Os planos Profissional e Max incluem licença de uso comercial e download sem marca d'água."],
    ["Posso cancelar quando quiser?", "Sim. Os planos são mensais e você cancela a renovação a qualquer momento; o que já foi pago vale até o fim do período."],
    ["Quais são as formas de pagamento?", "Os planos são cobrados no cartão de crédito, com renovação automática. Os créditos avulsos podem ser pagos com Pix ou cartão. O pagamento é processado pelo Asaas."],
  ];

  return (
    <div className="lp">
      <div className="lp-aurora" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /></div>
      <div className="lp-grid" aria-hidden="true" />
      <Nav logged={!!u} />

      <main>
        {/* ---------- herói ---------- */}
        <section className="lp-hero">
          <div className="lp-in lp-herow">
            <h1>{t("Faça renders fotorrealistas em segundos com")} <em>{t("o Croqui")}</em></h1>
            <p className="lp-lead">{t("O Croqui é uma plataforma para arquitetos que transforma o print ou esboço de qualquer modelo em render fotorrealista, sem hardware caro. Use pelo celular ou pelo desktop, de onde estiver.")}</p>
            <div className="lp-cta">
              <Link className="btn lg" href={start}>{t(startLabel)}</Link>
            </div>
            <div className="lp-stage lp-stagehead">
              <HouseSplit />
            </div>
          </div>
        </section>


        {temVideo && (
          <section className="lp-sec lp-in" id="video">
            <p className="lp-pill">{t("Veja em ação")}</p>
            <h2>{t("Tudo o que o Croqui faz, em poucos segundos")}</h2>
            <div className="lp-video"><video src="/demo/croqui.mp4" controls playsInline preload="metadata" /></div>
          </section>
        )}

        {/* ---------- funcionalidades (escuro) ---------- */}
        <section className="lp-dark" id="ferramentas">
          <div className="lp-in lp-sec">
            <div className="lp-center">
              <p className="lp-pill">{t("Funcionalidades")}</p>
              <h2>{t("Veja todas as funcionalidades do Croqui que você vai ter acesso")}</h2>
              <p className="lp-sub">{t("O Croqui gera renders, variações de luz e de estilo, interpreta croquis, edita regiões da imagem e monta o filme do projeto.")}</p>
              <a className="btn lg lp-btn-light" href="#planos">{t("Ver planos")} »</a>
            </div>
            <div className="lp-tools">
              {FERRAMENTAS.map(([id, desc]) => {
                const x = toolById(id);
                return x ? (
                  <div key={id} className="lp-tool">
                    <ToolGlyph id={id} size={68} />
                    <h3>{t(x.label)}</h3>
                    <p>{t(desc)}</p>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* imagem em vídeo */}
          <div className="lp-in lp-sec lp-vid">
            <div>
              <p className="lp-pill">{t("Funcionalidades")}</p>
              <h2>{t("Transforme imagens em vídeos")}</h2>
              <p className="lp-sub">{t("O filme do projeto transforma cada imagem em uma cena animada, com movimento suave de câmera, e junta tudo em um único vídeo Full HD pronto para apresentar ao cliente.")}</p>
              <a className="btn lg lp-btn-light" href="#planos">{t("Ver planos")} »</a>
            </div>
            <div className="lp-loop">
              <video src="/landing/filme-hd.mp4" poster="/landing/filme-hd-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-label={t("Exemplo de cena animada do filme do projeto")} />
            </div>
          </div>
        </section>

        {/* ---------- etapas ---------- */}
        <section className="lp-sec lp-in" id="etapas">
          <h2>{t("Cinco etapas, uma atrás da outra.")}</h2>
          <p className="lp-sub">{t("Cada resultado alimenta o próximo: o render vira variação de luz, e a variação vira cena do filme.")}</p>
          <ol className="lp-steps">
            {ETAPAS.map(([titulo, d], i) => (
              <li key={titulo}><span className="n">{i + 1}</span><h3>{t(titulo)}</h3><p>{t(d)}</p></li>
            ))}
          </ol>
        </section>

        {/* ---------- benefícios ---------- */}
        <section className="lp-sec lp-in" id="beneficios">
          <p className="lp-pill">{t("Benefícios")}</p>
          <h2>{t("Com o Croqui você ganha mais tempo para criar")}</h2>
          <p className="lp-sub">{t("Tudo o que você precisa saber sobre o Croqui, da compra ao uso.")}</p>
          <Benefits />
        </section>

        {/* ---------- calculadora ---------- */}
        <section className="lp-sec lp-alt">
          <div className="lp-in">
            <h2>{t("Quanto você economiza?")}</h2>
            <p className="lp-sub">{t("Compare o que você paga hoje por render com um plano do Croqui. Ajuste os números ao seu caso.")}</p>
            <Savings />
          </div>
        </section>

        {/* ---------- para quem ---------- */}
        <section className="lp-sec lp-in" id="para-quem">
          <div className="lp-center">
            <p className="lp-pill">{t("Saiba mais sobre o Croqui")}</p>
            <h2>{t("O Croqui é uma solução perfeita para..")}</h2>
          </div>
          <div className="lp-who">
            {PARA_QUEM.map((x) => (
              <div key={x.titulo}><Icon name={x.icon} /><h3>{t(x.titulo)}</h3><p>{t(x.texto)}</p></div>
            ))}
          </div>
          <div className="lp-center"><Link className="btn lg" href={start}>{t(startLabel)}</Link></div>
        </section>

        {/* ---------- planos ---------- */}
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
                <p className="lp-renders">{t("até {n} renders rápidos por mês", { n: Math.floor(p.creditosMes / COSTS.renderPorImagem).toLocaleString("pt-BR") })}</p>
                <ul>{p.itens.map((i) => <li key={i}><Icon name="check" />{t(i)}</li>)}</ul>
                <Link className={`btn ${p.destaque ? "" : "ghost"}`} href={u ? "/app/creditos" : "/cadastro"}>{t("Assinar")}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- perguntas ---------- */}
        <section className="lp-sec lp-in" id="faq">
          <div className="lp-faqgrid">
            <div>
              <p className="lp-pill">{t("Tem dúvidas sobre o Croqui?")}</p>
              <h2>{t("Perguntas frequentes")}</h2>
              <p className="lp-sub">{t("Tudo o que você precisa saber sobre o Croqui, da compra ao uso.")}</p>
            </div>
            <div className="lp-faq">
              {faq.map(([q, a, vars]) => (
                <details key={q}><summary>{t(q)}</summary><p>{t(a, vars)}</p></details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- chamada final ---------- */}
        <section className="lp-in">
          <div className="lp-final">
            <h2>{t("Transforme os seus projetos com o Croqui")}</h2>
            <p>{t("O Croqui gera novas ideias para ambientes internos e externos, interpreta croquis, edita regiões e monta o filme do projeto.")}</p>
            <div className="lp-cta">
              <Link className="btn lg" href={start}>{t(startLabel)}</Link>
              <a className="btn lg ghost" href="#planos">{t("Ver planos")} »</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-in">
          <div className="lp-foottop"><span className="brand" style={{ padding: 0 }}><Logo />Croqui</span></div>
          <div className="lp-footgrid">
            <div>
              <p className="lp-tag">{t("A IA que transforma o jeito de criar projetos de arquitetura.")}</p>
            </div>
            <div>
              <h4>{t("Funcionalidades")}</h4>
              {["render", "melhorar", "moodboard", "filme"].map((id) => { const x = toolById(id); return x ? <a key={id} href="#ferramentas">{t(x.label)}</a> : null; })}
            </div>
            <div>
              <h4>{t("Profissionais")}</h4>
              <a href="#para-quem">{t("Estudantes e entusiastas")}</a>
              <a href="#para-quem">{t("Escritórios de arquitetura")}</a>
              <a href="#para-quem">{t("Profissionais autônomos")}</a>
            </div>
            <div>
              <h4>{t("Recursos")}</h4>
              <a href="#etapas">{t("Como funciona")}</a>
              <a href="#planos">{t("Planos")}</a>
              <a href="#faq">{t("Perguntas frequentes")}</a>
            </div>
            <div>
              <h4>{t("Legal")}</h4>
              <Link href="/termos">{t("Termos de Uso")}</Link>
              <Link href="/privacidade">{t("Política de Privacidade")}</Link>
              <Link href={u ? "/app/suporte" : "/login"}>{t("Suporte")}</Link>
            </div>
          </div>
          <p className="lp-copy">© {new Date().getFullYear()} Croqui. {t("Todos os direitos reservados.")}</p>
        </div>
      </footer>
    </div>
  );
}
