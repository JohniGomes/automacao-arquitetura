"use client";
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";

/** **negrito** dentro de uma linha, sem HTML solto. */
function Inline({ s }: { s: string }) {
  return <>{s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}</>;
}

/** Mostra o memorial (Markdown simples do servidor) formatado na tela, com botão para copiar o texto. */
export default function MemorialView({ file }: { file: string }) {
  const t = useT();
  const [txt, setTxt] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/files/${file}`).then((r) => (r.ok ? r.text() : Promise.reject())).then((x) => vivo && setTxt(x)).catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [file]);

  if (erro) return <p className="small muted">{t("Não foi possível mostrar o texto aqui. Baixe o arquivo Word.")}</p>;
  if (txt === null) return <p className="small muted">{t("Carregando o memorial…")}</p>;

  const linhas = txt.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  const blocos: React.ReactNode[] = [];
  let lista: string[] = [];
  const fecha = (k: number) => { if (lista.length) { blocos.push(<ul key={`u${k}`}>{lista.map((x, i) => <li key={i}><Inline s={x} /></li>)}</ul>); lista = []; } };
  linhas.forEach((l, k) => {
    if (/^\s*[-*] /.test(l)) { lista.push(l.replace(/^\s*[-*] /, "")); return; }
    fecha(k);
    if (l.startsWith("# ")) blocos.push(<h2 key={k} className="mem-t">{l.slice(2)}</h2>);
    else if (l.startsWith("## ")) blocos.push(<h3 key={k}>{l.slice(3)}</h3>);
    else if (l.startsWith("### ")) blocos.push(<h4 key={k}>{l.slice(4)}</h4>);
    else blocos.push(<p key={k}><Inline s={l} /></p>);
  });
  fecha(linhas.length);

  return (
    <div className="memorial">
      <div className="mem-bar">
        <button type="button" className="ghost" onClick={async () => { try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* o usuário copia à mão */ } }}>{copiado ? t("Copiado!") : t("Copiar texto")}</button>
      </div>
      <article className="mem-doc">{blocos}</article>
    </div>
  );
}
