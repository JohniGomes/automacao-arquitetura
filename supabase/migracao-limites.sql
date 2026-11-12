-- Limites de uso compartilhados entre instâncias (login, cadastro, pagamento, gerações...).
-- Cole no SQL Editor do Supabase e execute (pode repetir sem problema).

create table if not exists public.rate_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_key_at on public.rate_hits (key, at);
alter table public.rate_hits enable row level security;

-- Conta a tentativa e diz se passou do limite (true = bloqueado). Tentativas bloqueadas não entram na conta.
create or replace function public.rate_hit(p_key text, p_max int, p_window_ms int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext(p_key));
  select count(*) into n from public.rate_hits where key = p_key and at > now() - (p_window_ms || ' milliseconds')::interval;
  if n >= p_max then return true; end if;
  insert into public.rate_hits(key) values (p_key);
  -- limpeza ocasional de registros velhos (mais de 1 dia)
  if random() < 0.02 then delete from public.rate_hits where at < now() - interval '1 day'; end if;
  return false;
end $$;
revoke all on function public.rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_hit(text, int, int) to service_role;
