const fs = require("fs");
process.chdir("D:/WinTemp/wt-saldo");
function E(f, fn) {
  let s = fs.readFileSync(f, "utf8");
  const c = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  const rep = (a, b) => { if (!s.includes(a)) throw new Error(f + ": " + a.slice(0, 80)); s = s.replace(a, () => b); };
  fn(rep, () => s);
  fs.writeFileSync(f, c ? s.replace(/\n/g, "\r\n") : s);
}

// layout: aviso no topo do conteúdo e limite para o Cro
E("app/app/layout.tsx", (rep) => {
  rep('import ChatCro from "@/components/ChatCro";', 'import ChatCro from "@/components/ChatCro";\nimport AvisoCreditos from "@/components/AvisoCreditos";\nimport { limiteBaixo } from "@/lib/saldo";');
  rep("  const semPlano = !activePlan(u);", "  const semPlano = !activePlan(u);\n  const limite = limiteBaixo(activePlan(u)?.creditosMes);");
  rep("<ChatCro nome={u.name || u.email} />", "<ChatCro nome={u.name || u.email} creditos={u.credits} limite={limite} />");
  rep("          {needsVerification(u) && <VerifyBanner email={u.email} />}\n", "          {needsVerification(u) && <VerifyBanner email={u.email} />}\n          <AvisoCreditos creditos={u.credits} limite={limite} />\n");
});

// Cro (botão e chat) muda de humor conforme o saldo
E("components/ChatCro.tsx", (rep) => {
  rep('import Mascote from "./Mascote";', 'import Mascote, { type Humor } from "./Mascote";\nimport { useCredits } from "./useCredits";\nimport { nivelSaldo } from "@/lib/saldo";');
  rep("export default function ChatCro({ nome }: { nome: string }) {\n  const t = useT();", "export default function ChatCro({ nome, creditos, limite }: { nome: string; creditos: number; limite: number }) {\n  const t = useT();\n  const saldo = useCredits(creditos);\n  const nivel = saldo == null ? \"ok\" : nivelSaldo(saldo, limite);\n  const humorBase: Humor = nivel === \"acabou\" ? \"triste\" : nivel === \"baixo\" ? \"preocupado\" : \"feliz\";");
  rep('<Mascote size={58} />', '<Mascote size={58} humor={humorBase} />');
  rep('<Mascote size={44} humor={busy ? "pensando" : "feliz"} animado={false} />', '<Mascote size={44} humor={busy ? "pensando" : humorBase} animado={false} />');
  rep('<p>{t("Oi")}{primeiro ? `, ${primeiro}` : ""}! {t("Eu sou o Cro. Pergunte como usar uma ferramenta, quanto custa ou como funcionam os créditos.")}</p>', '<p>{t("Oi")}{primeiro ? `, ${primeiro}` : ""}! {nivel === "acabou" ? t("Seus créditos acabaram. Posso te explicar como comprar mais ou qual plano combina com você.") : nivel === "baixo" ? t("Seus créditos estão acabando. Posso te ajudar a escolher como recarregar.") : t("Eu sou o Cro. Pergunte como usar uma ferramenta, quanto custa ou como funcionam os créditos.")}</p>');
});

// contadores animados no topo do celular, na Conta e na tela de créditos
E("components/MobileTop.tsx", (rep) => {
  rep('import Mascote from "./Mascote";', 'import Mascote from "./Mascote";\nimport Numero from "./anim/Numero";');
  rep('<b>{c ?? "…"}</b> {t("créditos")}</Link>', '<b>{c != null ? <Numero valor={c} duracao={0.8} /> : "…"}</b> {t("créditos")}</Link>');
});
E("components/AccountView.tsx", (rep) => {
  rep('<b>{c ?? "…"}</b><span className="unit">', '<b>{c != null ? <Numero valor={c} duracao={1.2} /> : "…"}</b><span className="unit">');
  const s0 = fs.readFileSync("components/AccountView.tsx", "utf8");
  const m = s0.match(/^import [^\n]*\n/m);
  rep(m[0], m[0] + 'import Numero from "./anim/Numero";\n');
});
E("app/app/creditos/page.tsx", (rep) => {
  rep('<h2>{t("Saldo")}: {u.credits} {t("créditos")}</h2>', '<h2>{t("Saldo")}: <Numero valor={u.credits} duracao={1.2} /> {t("créditos")}</h2>');
  const s0 = fs.readFileSync("app/app/creditos/page.tsx", "utf8");
  const m = s0.match(/^import [^\n]*\n/m);
  rep(m[0], m[0] + 'import Numero from "@/components/anim/Numero";\n');
});

// ferramentas: sem saldo suficiente, o Cro triste explica e o botão fica desligado
E("components/ToolShell.tsx", (rep) => {
  rep('import Numero from "./anim/Numero";', 'import Numero from "./anim/Numero";\nimport Mascote from "./Mascote";');
  rep('<button className="full" disabled={busy || !canGenerate} aria-busy={busy} onClick={onGenerate}>', '{faltam > 0 && (\n              <div className="tp-falta" role="alert">\n                <Mascote humor="triste" size={40} animado={false} />\n                <p>{t("Faltam {n} créditos para gerar.", { n: faltam })} <Link href="/app/creditos">{t("Comprar créditos")}</Link></p>\n              </div>\n            )}\n            <button className="full" disabled={busy || !canGenerate || faltam > 0} aria-busy={busy} onClick={onGenerate}>');
  rep("  const t = useT();\n", "  const t = useT();\n  const faltam = saldo != null && saldo < cost ? cost - saldo : 0;\n");
});
console.log("ok");
