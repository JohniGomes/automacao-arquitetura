-- Verificação de e-mail. Cole no SQL Editor do Supabase e execute (pode repetir sem problema).
-- Quem já tem conta é tratado como verificado; só os cadastros novos precisam confirmar o e-mail.

alter table public.users add column if not exists email_verified_at timestamptz;
update public.users set email_verified_at = created_at where email_verified_at is null;
