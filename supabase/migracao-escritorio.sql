-- Marca do escritório nas pranchas (planos Profissional e Max). Cole no SQL Editor do Supabase e execute (uma vez).
create table if not exists public.offices (
  user_id uuid primary key references public.users(id) on delete cascade,
  nome text not null default '',
  responsavel text not null default '',
  registro text not null default '',
  cor text not null default '',
  logo text,
  updated_at timestamptz not null default now()
);
alter table public.offices enable row level security;
