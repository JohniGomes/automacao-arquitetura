-- Cupons do painel de administração. Cole no SQL Editor do Supabase e execute (uma vez).
create table if not exists public.coupons (
  code text primary key,                 -- sempre em minúsculas
  creditos integer not null check (creditos >= 0),
  dias integer not null check (dias > 0),
  plano text not null default 'max',
  limite integer,                        -- máximo de contas (vazio = sem limite)
  valido_ate timestamptz,                -- último momento para resgatar (vazio = sem data)
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
