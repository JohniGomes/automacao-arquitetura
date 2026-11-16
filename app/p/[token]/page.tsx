import { notFound } from "next/navigation";
import { dadosDoLink } from "@/lib/share";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Apresentação do projeto", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

/** Página pública de apresentação de um projeto (link revogável, sem login). Em português: quem abre é o cliente do arquiteto. */
export default async function Apresentacao({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await store.getShare(token).catch(() => null);
  const dados = share ? await dadosDoLink(share) : null;
  if (!dados) notFound();
  const { projeto, itens, escritorio } = dados;
  const cor = escritorio?.cor && /^#[0-9a-f]{6}$/i.test(escritorio.cor) ? escritorio.cor : "#d6402f";
  const arquivo = (f: string, w?: number) => `/api/p/${token}/${encodeURIComponent(f)}${w ? `?w=${w}` : ""}`;
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {escritorio?.logo && <img src={arquivo(escritorio.logo)} alt={escritorio.nome || "Escritório"} style={{ maxHeight: 64, maxWidth: 240 }} />}
        {escritorio?.nome && <strong style={{ fontSize: 20 }}>{escritorio.nome}</strong>}
      </header>
      <p style={{ margin: 0, letterSpacing: 3, fontSize: 12, fontWeight: 700, color: cor }}>APRESENTAÇÃO DO PROJETO</p>
      <h1 style={{ margin: "4px 0 24px" }}>{projeto}</h1>
      {itens.length === 0 ? (
        <p>Este projeto ainda não tem imagens para mostrar.</p>
      ) : (
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {itens.map((i) => (
            <figure key={i.file} style={{ margin: 0 }}>
              {i.kind === "video"
                ? <video src={arquivo(i.file)} controls preload="metadata" style={{ width: "100%", borderRadius: 10 }} />
                : <a href={arquivo(i.file)} target="_blank" rel="noopener noreferrer"><img src={arquivo(i.file, 900)} alt={i.label} loading="lazy" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line, #ddd6c8)" }} /></a>}
              <figcaption style={{ marginTop: 6, fontSize: 14 }}>{i.label}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <footer style={{ marginTop: 40, fontSize: 12, opacity: 0.6 }}>Imagens ilustrativas geradas com Croqui. Posições e medidas do mapa de situação são aproximadas, sem valor cadastral ou legal.</footer>
    </main>
  );
}
