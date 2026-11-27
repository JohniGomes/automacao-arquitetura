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
import Reveal from "@/components/anim/Reveal";
import Numero from "@/components/anim/Numero";
import Brilho from "@/components/anim/Brilho";
import Ima from "@/components/anim/Ima";
import Holofote from "@/components/anim/Holofote";
import Savings from "@/components/landing/Savings";
import { getT } from "@/lib/i18n-server";
import { emNatal } from "@/lib/natal";

export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

const ETAPAS = [
  ["Mapa de situação", "Digite o endereço e receba o entorno em uma vista aérea realista, fiel às ruas e quadras do satélite. Se preferir, envie o seu próprio print."],
  ["Moodboard", "Escolha o modelo de composição e o ambiente (cozinha, sala, banheiro ou quarto). Cores e materiais saem da casa de referência do seu projeto."],
  ["Render", "Envie o print do modelo 3D e receba quatro versões fotorrealistas. A geometria, as aberturas e o enquadramento do seu modelo são preservados."],
  ["Variação de luz", "Manhã, golden hour, blue hour, noite ou uma luz descrita por você. A casa, a câmera e a composição ficam como estão."],
  ["Memorial descritivo", "Envie uma foto do projeto e receba o memorial descritivo completo: descrição da arquitetura, estrutura, materiais, acabamentos e instalações, em texto e em Word para editar."],
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
  ["memorial", "Memorial descritivo completo a partir de uma foto, em texto e Word."],
];

const PARA_QUEM: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "school", titulo: "Estudantes e entusiastas", texto: "Tire suas ideias do papel e apresente projetos acadêmicos com imagens de alto nível, sem montar uma estação de render." },
  { icon: "building", titulo: "Escritórios de arquitetura", texto: "Padronize as apresentações da equipe e entregue ao cliente render, variações de luz e memorial descritivo sem depender de máquinas caras." },
  { icon: "laptop", titulo: "Profissionais autônomos", texto: "Aproveite as ferramentas para criar e simular o ambiente ideal para os seus clientes, direto do celular ou do computador." },
];

type Faq = [string, string, Record<string, string | number>?];

export default async function Landing() {
  const u = await currentUser();
  const { t } = await getT();
  // a oferta da landing vem do que a conta realmente recebe (SIGNUP_CREDITS), em renders inteiros
  const natal = emNatal();
  const bonus = Math.floor(env.signupCredits / COSTS.renderPorImagem);
  const start = u ? "/app" : "/cadastro";
  const startLabel = u ? "Abrir o app" : "Criar conta grátis";
  const temVideo = fs.existsSync(path.join(process.cwd(), "public", "demo", "croqui-memorial.mp4"));
  const precos = PLANOS.map((p) => p.preco);
  const faq: Faq[] = [
    ["O que é o Croqui?", "O Croqui é uma plataforma de IA para arquitetos: gera render, moodboard, variações de luz, mapa de situação e memorial descritivo a partir das suas imagens."],
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
      <Nav logged={!!u} natal={natal} />

      <main>
        {/* ---------- herói ---------- */}
        <section className="lp-hero">
          <div className="lp-in lp-herow">
            <Reveal mount distance={28} blur={10} duration={0.85}><h1>{t("Faça renders fotorrealistas em segundos com")} <em>{t("o Croqui")}</em></h1></Reveal>
            <Reveal mount delay={0.18} distance={24}><p className="lp-lead">{t("O Croqui é uma plataforma para arquitetos que transforma o print ou esboço de qualquer modelo em render fotorrealista, sem hardware caro. Use pelo celular ou pelo desktop, de onde estiver.")}</p></Reveal>
            <Reveal mount delay={0.34} distance={20}><div className="lp-cta">
              <Ima><Link className="btn lg" href={start}>{t(startLabel)}</Link></Ima>
            </div></Reveal>
            <Reveal mount delay={0.5} distance={50} scale={0.96} duration={0.95}><div className="lp-stage lp-stagehead">
              <HouseSplit />
            </div></Reveal>
          </div>
        </section>


        {temVideo && (
          <section className="lp-sec lp-in" id="video">
            <p className="lp-pill">{t("Veja em ação")}</p>
            <h2>{t("Tudo o que o Croqui faz, em poucos segundos")}</h2>
            <div className="lp-video"><video src="/demo/croqui-memorial.mp4" poster="/demo/croqui-memorial-poster.jpg" controls playsInline preload="none" /></div>
          </section>
        )}

        {/* ---------- funcionalidades (escuro) ---------- */}
        <section className="lp-dark" id="ferramentas">
          <div className="lp-in lp-sec">
            <Reveal><div className="lp-center">
              <p className="lp-pill">{t("Funcionalidades")}</p>
              <h2>{t("Veja todas as funcionalidades do Croqui que você vai ter acesso")}</h2>
              <p className="lp-sub">{t("O Croqui gera renders, variações de luz e de estilo, interpreta croquis, edita regiões da imagem e escreve o memorial descritivo.")}</p>
              <a className="btn lg lp-btn-light" href="#planos">{t("Ver planos")} »</a>
            </div></Reveal>
            <Reveal className="lp-tools" stagger={0.07} distance={30}>
              {FERRAMENTAS.map(([id, desc]) => {
                const x = toolById(id);
                return x ? (
                  <Holofote key={id} className="lp-tool">
                    <ToolGlyph id={id} size={68} />
                    <h3>{t(x.label)}</h3>
                    <p>{t(desc)}</p>
                  </Holofote>
                ) : null;
              })}
            </Reveal>
          </div>

        </section>

        {/* ---------- etapas ---------- */}
        <section className="lp-sec lp-in" id="etapas">
          <Reveal><h2>{t("Cinco etapas, uma atrás da outra.")}</h2>
          <p className="lp-sub">{t("Cada resultado alimenta o próximo: o render vira variação de luz, e o projeto pronto vira memorial descritivo.")}</p></Reveal>
          <Reveal delay={0.1}><ol className="lp-steps">
            {ETAPAS.map(([titulo, d], i) => (
              <li key={titulo}><span className="n">{i + 1}</span><h3>{t(titulo)}</h3><p>{t(d)}</p></li>
            ))}
          </ol></Reveal>
        </section>

        {/* ---------- benefícios ---------- */}
        <section className="lp-sec lp-in" id="beneficios">
          <Reveal><p className="lp-pill">{t("Benefícios")}</p>
          <h2>{t("Com o Croqui você ganha mais tempo para criar")}</h2>
          <p className="lp-sub">{t("Tudo o que você precisa saber sobre o Croqui, da compra ao uso.")}</p></Reveal>
          <Reveal delay={0.1}><Benefits /></Reveal>
        </section>

        {/* ---------- calculadora ---------- */}
        <section className="lp-sec lp-alt">
          <div className="lp-in">
            <Reveal><h2>{t("Quanto você economiza?")}</h2>
            <p className="lp-sub">{t("Compare o que você paga hoje por render com um plano do Croqui. Ajuste os números ao seu caso.")}</p></Reveal>
            <Reveal delay={0.1}><Savings /></Reveal>
          </div>
        </section>

        {/* ---------- para quem ---------- */}
        <section className="lp-sec lp-in" id="para-quem">
          <Reveal><div className="lp-center">
            <p className="lp-pill">{t("Saiba mais sobre o Croqui")}</p>
            <h2>{t("O Croqui é uma solução perfeita para..")}</h2>
          </div></Reveal>
          <Reveal className="lp-who" stagger={0.12} distance={34}>
            {PARA_QUEM.map((x) => (
              <Holofote key={x.titulo} className="lp-whocard"><Icon name={x.icon} /><h3>{t(x.titulo)}</h3><p>{t(x.texto)}</p></Holofote>
            ))}
          </Reveal>
          <Reveal><div className="lp-center"><Ima><Link className="btn lg" href={start}>{t(startLabel)}</Link></Ima></div></Reveal>
        </section>

        {/* ---------- planos ---------- */}
        <section className="lp-sec lp-in" id="planos">
          <Reveal><h2>{t("Escolha seu plano")}</h2>
          <p className="lp-sub">{t("Planos mensais, pagos no cartão de crédito, com renovação automática. Cancele quando quiser.")}</p></Reveal>
          <Reveal className="lp-plans" stagger={0.14} distance={40}>
            {PLANOS.map((p) => (
              <Holofote key={p.id} className={`lp-plan ${p.destaque ? "feat" : ""}`}>
                {p.destaque && <span className="lp-badge"><Brilho texto={t("mais escolhido")} /></span>}
                <h3>{t(p.nome)}</h3>
                <p className="lp-price"><b>{brl(p.preco)}</b><span>/{t("mês")}</span></p>
                <p className="lp-credits"><Numero valor={p.creditosMes} atraso={0.3} /> {t("créditos por mês")}</p>
                <p className="lp-renders">{t("até {n} renders rápidos por mês", { n: Math.floor(p.creditosMes / COSTS.renderPorImagem).toLocaleString("pt-BR") })}</p>
                <ul>{p.itens.map((i) => <li key={i}><Icon name="check" />{t(i)}</li>)}</ul>
                <Link className={`btn ${p.destaque ? "" : "ghost"}`} href={u ? "/app/creditos" : "/cadastro"}>{t("Assinar")}</Link>
              </Holofote>
            ))}
          </Reveal>
        </section>

        {/* ---------- perguntas ---------- */}
        <section className="lp-sec lp-in" id="faq">
          <div className="lp-faqgrid">
            <Reveal><div>
              <p className="lp-pill">{t("Tem dúvidas sobre o Croqui?")}</p>
              <h2>{t("Perguntas frequentes")}</h2>
              <p className="lp-sub">{t("Tudo o que você precisa saber sobre o Croqui, da compra ao uso.")}</p>
            </div></Reveal>
            <Reveal delay={0.12}><div className="lp-faq">
              {faq.map(([q, a, vars]) => (
                <details key={q}><summary>{t(q)}</summary><p>{t(a, vars)}</p></details>
              ))}
            </div></Reveal>
          </div>
        </section>

        {/* ---------- chamada final ---------- */}
        <section className="lp-in">
          <Reveal scale={0.96} distance={40}><div className="lp-final">
            <h2>{t("Transforme os seus projetos com o Croqui")}</h2>
            <p>{t("O Croqui gera novas ideias para ambientes internos e externos, interpreta croquis, edita regiões e escreve o memorial descritivo.")}</p>
            <div className="lp-cta">
              <Link className="btn lg" href={start}>{t(startLabel)}</Link>
              <a className="btn lg ghost" href="#planos">{t("Ver planos")} »</a>
            </div>
          </div></Reveal>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-in">
          <div className="lp-foottop"><span className="brand" style={{ padding: 0 }}><Logo natal={natal} />Croqui</span></div>
          <div className="lp-footgrid">
            <div>
              <p className="lp-tag">{t("A IA que transforma o jeito de criar projetos de arquitetura.")}</p>
            </div>
            <div>
              <h4>{t("Funcionalidades")}</h4>
              {["render", "melhorar", "moodboard", "memorial"].map((id) => { const x = toolById(id); return x ? <a key={id} href="#ferramentas">{t(x.label)}</a> : null; })}
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
