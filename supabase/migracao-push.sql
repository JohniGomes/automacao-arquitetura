-- Notificações push no celular. Cole no SQL Editor do Supabase e execute (uma vez).
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs (user_id);
alter table public.push_subs enable row level security;
