-- Links públicos de apresentação de projetos (planos Profissional e Max). Cole no SQL Editor do Supabase e execute (uma vez).
create table if not exists public.shares (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists shares_user on public.shares (user_id) where revoked_at is null;
create index if not exists shares_project on public.shares (project_id);
alter table public.shares enable row level security;
