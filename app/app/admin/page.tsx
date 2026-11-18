import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { currentUser } from "@/lib/auth";
import { dadosAdmin, isAdmin } from "@/lib/admin";
import { PLANOS } from "@/lib/costs";
import AdminCupons from "@/components/AdminCupons";

export const dynamic = "force-dynamic";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Painel de administração do Croqui: usuários, assinaturas, cupons e custo de IA. Só para os e-mails de ADMIN_EMAILS. */
export default async function Admin() {
  const u = await currentUser();
  if (!isAdmin(u)) notFound();
  const d = await dadosAdmin();
  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") || "https"}://${h.get("host")}`;
  const kpi = (rot: string, val: string | number, sub?: string) => <div className="akpi"><span>{rot}</span><b>{val}</b>{sub && <small>{sub}</small>}</div>;

  return (
    <>
      <h1>Administração</h1>
      <p className="small muted">Números dos últimos 30 dias, a menos que diga o contrário. Custos de IA são estimativas a partir do consumo registrado em cada geração (ajustáveis por variáveis no Render).</p>

      <h2 className="grouptitle">Resumo</h2>
      <div className="akpis">
        {kpi("MRR", brl(d.assinaturas.mrr), `${d.assinaturas.pagantes} assinaturas pagas`)}
        {kpi("Receita (30 dias)", brl(d.assinaturas.receita30), `planos ${brl(d.assinaturas.receitaPlanos30)}`)}
        {kpi("Custo de IA (30 dias)", brl(d.custos.custoTotal), "estimado")}
        {kpi("Margem (30 dias)", brl(d.custos.margem30), "receita − custo")}
        {kpi("Usuários", d.totais.usuarios, `${d.totais.verificados} com e-mail confirmado`)}
        {kpi("Ativos (7 dias)", d.totais.ativos7, `${d.totais.ativos30} em 30 dias`)}
        {kpi("Novos cadastros", d.totais.novos7, `${d.totais.novos30} em 30 dias`)}
        {kpi("Gerações (30 dias)", d.totais.geracoes30, `${d.totais.falhas30} com erro`)}
      </div>

      <AdminCupons cupons={d.cupons} planos={PLANOS.map((p) => ({ id: p.id, nome: p.nome }))} origem={origem} />

      <div className="card">
        <h2>Assinaturas</h2>
        <div className="atable-wrap"><table className="atable">
          <thead><tr><th>Plano</th><th>Preço</th><th>Assinantes</th><th>Renovando</th><th>MRR</th></tr></thead>
          <tbody>
            {d.assinaturas.porPlano.map((p) => <tr key={p.id}><td>{p.nome}</td><td>{brl(p.preco)}</td><td>{p.assinantes}</td><td>{p.renovando}</td><td>{brl(p.mrr)}</td></tr>)}
            <tr><td colSpan={2}><b>Total</b></td><td><b>{d.assinaturas.pagantes}</b></td><td><b>{d.assinaturas.pagantes - d.assinaturas.cancelando}</b></td><td><b>{brl(d.assinaturas.mrr)}</b></td></tr>
          </tbody>
        </table></div>
        <p className="small muted">{d.assinaturas.cancelando} assinatura(s) com a renovação cancelada (valem até o fim do período). {d.assinaturas.emCupom} conta(s) com plano sem assinatura (cupom ou concedido à mão).</p>
      </div>

      <div className="card">
        <h2>Custo de IA (30 dias)</h2>
        <p className="small">{d.custos.imagens} imagens × {brl(d.custos.custo.imagem)} = {brl(d.custos.custoIA)}{d.custos.clipes > 0 && <> · {d.custos.clipes} clipes × {brl(d.custos.custo.clipe)}</>} · Mapas (Google Maps) {brl(d.custos.custoMaps)} · <b>Total {brl(d.custos.custoTotal)}</b></p>
        <div className="atable-wrap"><table className="atable">
          <thead><tr><th>Ferramenta</th><th>Gerações</th><th>Imagens</th><th>Custo</th></tr></thead>
          <tbody>{d.custos.porTipo.length === 0 ? <tr><td colSpan={4} className="muted">Sem gerações reais no período.</td></tr> : d.custos.porTipo.map((t) => <tr key={t.tipo}><td>{t.tipo}</td><td>{t.n}</td><td>{t.img}</td><td>{brl(t.custo)}</td></tr>)}</tbody>
        </table></div>
        <h3>Por dia (últimos 14 com uso)</h3>
        <div className="atable-wrap"><table className="atable">
          <thead><tr><th>Dia</th><th>Gerações</th><th>Custo</th></tr></thead>
          <tbody>{d.custos.porDia.map((x) => <tr key={x.dia}><td>{dt(x.dia)}</td><td>{x.n}</td><td>{brl(x.custo)}</td></tr>)}</tbody>
        </table></div>
        <h3>Quem mais consome</h3>
        <div className="atable-wrap"><table className="atable">
          <thead><tr><th>Usuário</th><th>Gerações</th><th>Custo</th></tr></thead>
          <tbody>{d.custos.porUsuario.map((x) => <tr key={x.email}><td>{x.email}</td><td>{x.n}</td><td>{brl(x.custo)}</td></tr>)}</tbody>
        </table></div>
      </div>

      <div className="card">
        <h2>Usuários (60 mais recentes)</h2>
        <div className="atable-wrap"><table className="atable">
          <thead><tr><th>E-mail</th><th>Nome</th><th>Cadastro</th><th>Plano</th><th>Créditos</th><th>E-mail confirmado</th></tr></thead>
          <tbody>{d.usuarios.map((x) => <tr key={x.id}><td>{x.email}</td><td>{x.nome}</td><td>{dt(x.criado)}</td><td>{x.plano ? `${x.plano}${x.cupom ? " (cupom/manual)" : ""}` : "—"}</td><td>{x.creditos}</td><td>{x.verificado ? "Sim" : "Não"}</td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  );
}
