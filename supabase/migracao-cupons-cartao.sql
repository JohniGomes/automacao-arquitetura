-- Cupom de acesso sem cartão (só o VDO Club). Cole no SQL Editor do Supabase e execute (uma vez).
alter table public.coupons add column if not exists sem_cartao boolean not null default false;
-- depois, no painel de administração, edite o cupom do VDO Club e marque "Sem cartão"
-- (ou rode: update public.coupons set sem_cartao = true where code = 'vdoclub';)
