-- Planos, assinaturas e pagamentos (Mercado Pago). Cole no SQL Editor do Supabase e execute (pode repetir sem problema).

alter table public.users add column if not exists plan text;                    -- essencial | profissional | max
alter table public.users add column if not exists plan_interval text;           -- mensal | anual
alter table public.users add column if not exists plan_until timestamptz;       -- o plano vale até esta data
alter table public.users add column if not exists plan_status text;             -- ativo | cancelado
alter table public.users add column if not exists next_credit_at timestamptz;   -- próxima liberação mensal (plano anual)
alter table public.users add column if not exists mp_subscription_id text;      -- assinatura mensal no Mercado Pago

-- Um registro por pagamento recebido: a chave primária garante que o webhook não conceda créditos duas vezes.
create table if not exists public.payments (
  provider text not null,
  ref_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,                  -- pacote | plano
  item text not null,                  -- id do pacote ou do plano
  amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  primary key (provider, ref_id)
);
create index if not exists payments_user on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
-- sem policies: só o servidor (service role) lê e grava
