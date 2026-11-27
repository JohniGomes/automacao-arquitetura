-- Cupons de desconto em % ou R$. Cole no SQL Editor do Supabase e execute (uma vez), depois de migracao-cupons.sql.
alter table public.coupons add column if not exists tipo text not null default 'acesso';       -- acesso | percentual | valor
alter table public.coupons add column if not exists desconto numeric(10,2) not null default 0; -- % ou R$, conforme o tipo
