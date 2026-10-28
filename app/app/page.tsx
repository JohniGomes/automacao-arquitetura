import Link from "next/link";
import { COSTS } from "@/lib/costs";

const tools = [
  { href: "mapa", t: "Mapa de situação", d: "Endereço → satélite → mapa ilustrado com comércio e serviços do entorno.", c: `${COSTS.mapa} créditos` },
  { href: "moodboard", t: "Moodboard por ambiente", d: "Escolha um modelo, o ambiente e a casa de referência.", c: `${COSTS.moodboard} créditos` },
  { href: "render", t: "Render a partir de print", d: "Print do modelo 3D → 4 versões fotorrealistas preservando a geometria.", c: `${COSTS.renderPorImagem * 4} créditos (4 versões)` },
  { href: "luz", t: "Variação de iluminação", d: "Manhã, golden hour, blue hour, noite ou luz livre.", c: `${COSTS.luz} créditos` },
  { href: "filme", t: "Filme do projeto", d: "1 a 5 cenas com imagem + vídeo, juntadas em um MP4 Full HD.", c: `${COSTS.filmeImagemPorCena + COSTS.filmeVideoPorCena} créditos por cena` },
];

export default function Home() {
  return (
    <>
      <h1>O que vamos criar?</h1>
      <div className="tools">
        {tools.map((t) => (
          <Link key={t.href} href={`/app/${t.href}`}><div className="card"><h2>{t.t}</h2><p className="muted">{t.d}</p><span className="tag">{t.c}</span></div></Link>
        ))}
      </div>
    </>
  );
}
