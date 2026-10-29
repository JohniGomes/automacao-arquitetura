-- ArqIA — esquema do Supabase. Cole no SQL Editor do projeto e execute (uma vez).
-- O app acessa SOMENTE pelo servidor, com a service_role key; RLS fica ligado sem políticas,
-- então chaves anon/públicas não leem nada.

create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  name text not null,
  pass_hash text,
  google_id text,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now(),
  terms_accepted_at timestamptz,
  terms_version text
);

-- Projetos que já rodaram a versão anterior deste arquivo: execute também estas duas linhas.
alter table public.users add column if not exists terms_accepted_at timestamptz;
alter table public.users add column if not exists terms_version text;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_created on public.projects (user_id, created_at desc);
alter table public.projects enable row level security;

create table if not exists public.generations (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  favorite boolean not null default false,
  type text not null,
  status text not null,
  progress integer not null default 0,
  message text,
  summary text not null,
  prompt text,
  outputs jsonb not null default '[]'::jsonb,
  cost integer not null,
  mock boolean not null default false,
  error text,
  usage jsonb not null default '{"images":0,"videoClips":0}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
-- Bancos criados antes dos projetos: as duas linhas abaixo (ver também supabase/migracao-projetos.sql).
alter table public.generations add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.generations add column if not exists favorite boolean not null default false;
create index if not exists generations_project on public.generations (project_id);
create index if not exists generations_user_created on public.generations (user_id, created_at desc);
create index if not exists generations_status on public.generations (status);

create table if not exists public.credit_txs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  gen_id uuid,
  at timestamptz not null default now()
);
create index if not exists credit_txs_user_at on public.credit_txs (user_id, at desc);

alter table public.users enable row level security;
alter table public.generations enable row level security;
alter table public.credit_txs enable row level security;

-- Débito atômico: só debita se houver saldo; devolve false caso contrário.
create or replace function public.charge_credits(p_user uuid, p_amount integer, p_reason text, p_gen uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.users set credits = credits - p_amount where id = p_user and credits >= p_amount;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  insert into public.credit_txs (user_id, delta, reason, gen_id) values (p_user, -p_amount, p_reason, p_gen);
  return true;
end $$;

create or replace function public.grant_credits(p_user uuid, p_amount integer, p_reason text, p_gen uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users set credits = credits + p_amount where id = p_user;
  insert into public.credit_txs (user_id, delta, reason, gen_id) values (p_user, p_amount, p_reason, p_gen);
end $$;

revoke all on function public.charge_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, integer, text, uuid) from public, anon, authenticated;

-- Bucket privado para imagens e vídeos (acesso por URL assinada gerada no servidor).
insert into storage.buckets (id, name, public) values ('arqia', 'arqia', false) on conflict (id) do nothing;
