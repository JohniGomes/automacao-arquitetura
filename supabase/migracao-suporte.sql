-- Mensagens enviadas pela tela Suporte. Rode uma vez no SQL Editor do Supabase.
create table if not exists public.support_messages (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_at on public.support_messages (created_at desc);
alter table public.support_messages enable row level security;
-- sem policies: só o servidor (service role) lê e grava
