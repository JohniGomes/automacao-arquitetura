-- Migração incremental: projetos e favoritos. Cole no SQL Editor do Supabase e execute (pode repetir sem problema).
-- Use este arquivo se o seu banco já foi criado com a versão anterior do schema.sql.

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

alter table public.generations add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.generations add column if not exists favorite boolean not null default false;
create index if not exists generations_project on public.generations (project_id);
