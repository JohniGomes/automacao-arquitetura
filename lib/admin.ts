import type { Coupon, Generation, User } from "./db";
import { PLANOS } from "./costs";
import { usosDoCupom } from "./cupom";
import { activePlan } from "./plans";
import { store } from "./store";

/** Quem pode abrir o painel de administração: e-mails em ADMIN_EMAILS (separados por vírgula). Sem a variável, ninguém. */
export const admins = () => (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (u: Pick<User, "email" | "emailVerifiedAt"> | null) => !!u && admins().includes(u.email.toLowerCase());

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 && v !== "" && v !== undefined ? Number(v) : d);
/** Custos estimados em reais (ajuste no Render se o preço do Google mudar). */
export const CUSTO = () => ({
  imagem: num(process.env.CUSTO_IMAGEM_BRL, 0.28),
  clipe: num(process.env.CUSTO_CLIPE_BRL, 3.1),
  memorial: num(process.env.CUSTO_MEMORIAL_BRL, 0.15), // texto longo com imagem
  mapa: num(process.env.CUSTO_MAPA_BRL, 0.05), // Maps Static + Geocoding de cada mapa de situação
});

const DIA = 86_400_000;
const dia = (iso: string) => iso.slice(0, 10);
const custoGen = (g: Generation, c: ReturnType<typeof CUSTO>) => g.mock ? 0 : (g.usage?.images ?? 0) * c.imagem + (g.usage?.videoClips ?? 0) * c.clipe + (g.type === "mapa" ? c.mapa : 0) + (g.type === "memorial" ? c.memorial : 0);

export type CupomLinha = Coupon & { usos: number };

export async function dadosAdmin() {
  const agora = Date.now();
  const desde30 = new Date(agora - 30 * DIA).toISOString();
  const [users, gens, pagamentos, cupons, suporte] = await Promise.all([store.adminUsers(), store.adminGens(desde30), store.adminPayments(), store.listCoupons(), store.listSupport(30)]);
  const custo = CUSTO();

  // ---- usuários
  const ativos = (dias: number) => new Set(gens.filter((g) => new Date(g.createdAt).getTime() >= agora - dias * DIA).map((g) => g.userId)).size;
  const novos = (dias: number) => users.filter((u) => new Date(u.createdAt).getTime() >= agora - dias * DIA).length;

  // ---- assinaturas
  const comPlano = users.filter((u) => activePlan(u));
  // assinatura só conta como paga depois do primeiro pagamento de plano; antes disso a pessoa está no teste grátis
  const pagaram = new Set(pagamentos.filter((p) => p.kind === "plano").map((p) => p.userId));
  const pagantes = comPlano.filter((u) => u.asaasSubscriptionId && pagaram.has(u.id));
  const emTeste = comPlano.filter((u) => u.asaasSubscriptionId && !pagaram.has(u.id));
  const porPlano = PLANOS.map((p) => {
    const ativas = pagantes.filter((u) => u.plan === p.id);
    return { id: p.id, nome: p.nome, preco: p.preco, assinantes: ativas.length, renovando: ativas.filter((u) => u.planStatus !== "cancelado").length, mrr: ativas.filter((u) => u.planStatus !== "cancelado").length * p.preco };
  });
  const mrr = porPlano.reduce((s, p) => s + p.mrr, 0);
  const emCupom = comPlano.filter((u) => !u.asaasSubscriptionId).length;
  const receita30 = pagamentos.filter((p) => p.createdAt >= desde30).reduce((s, p) => s + p.amount, 0);
  const receitaPlanos30 = pagamentos.filter((p) => p.createdAt >= desde30 && p.kind === "plano").reduce((s, p) => s + p.amount, 0);

  // ---- cupons
  const cuponsLinhas: CupomLinha[] = await Promise.all(cupons.map(async (c) => ({ ...c, usos: await usosDoCupom(c) })));

  // ---- custo de IA (30 dias, só o que não foi mock)
  const reais = gens.filter((g) => !g.mock);
  const imagens = reais.reduce((s, g) => s + (g.usage?.images ?? 0), 0);
  const clipes = reais.reduce((s, g) => s + (g.usage?.videoClips ?? 0), 0);
  const custoIA = imagens * custo.imagem + clipes * custo.clipe;
  const custoMaps = reais.filter((g) => g.type === "mapa").length * custo.mapa;
  const custoTotal = custoIA + custoMaps;
  const porTipo = Object.entries(reais.reduce<Record<string, { n: number; img: number; custo: number }>>((a, g) => {
    const x = (a[g.type] ??= { n: 0, img: 0, custo: 0 });
    x.n++; x.img += g.usage?.images ?? 0; x.custo += custoGen(g, custo);
    return a;
  }, {})).map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.custo - a.custo);
  const porDia = Object.entries(reais.reduce<Record<string, { n: number; custo: number }>>((a, g) => {
    const x = (a[dia(g.createdAt)] ??= { n: 0, custo: 0 });
    x.n++; x.custo += custoGen(g, custo);
    return a;
  }, {})).map(([d, v]) => ({ dia: d, ...v })).sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 14);
  const porUsuario = Object.entries(reais.reduce<Record<string, number>>((a, g) => { a[g.userId] = (a[g.userId] ?? 0) + custoGen(g, custo); return a; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, c]) => ({ email: users.find((u) => u.id === id)?.email ?? id, custo: c, n: reais.filter((g) => g.userId === id).length }));
  const falhas = gens.filter((g) => g.status === "error").length;

  return {
    totais: { usuarios: users.length, verificados: users.filter((u) => u.emailVerifiedAt).length, novos7: novos(7), novos30: novos(30), ativos7: ativos(7), ativos30: ativos(30), geracoes30: gens.length, falhas30: falhas },
    assinaturas: { porPlano, mrr, pagantes: pagantes.length, emTeste: emTeste.length, emCupom, cancelando: pagantes.filter((u) => u.planStatus === "cancelado").length, receita30, receitaPlanos30 },
    cupons: cuponsLinhas,
    suporte: suporte.map((m) => ({ id: m.id, email: m.email, assunto: m.subject, mensagem: m.message, em: m.createdAt })),
    custos: { custo, imagens, clipes, custoIA, custoMaps, custoTotal, porTipo, porDia, porUsuario, margem30: receita30 - custoTotal },
    usuarios: users.slice(0, 60).map((u) => ({ id: u.id, email: u.email, nome: u.name, criado: u.createdAt, plano: activePlan(u)?.nome ?? "", cupom: !!activePlan(u) && !u.asaasSubscriptionId, creditos: u.credits, verificado: !!u.emailVerifiedAt })),
  };
}
