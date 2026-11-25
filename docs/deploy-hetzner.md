# Croqui na VPS (Hetzner) com Docker

O app roda em um contêiner Node (Next.js + ffmpeg embutido) atrás do Caddy, que emite o HTTPS sozinho. Banco e arquivos continuam no Supabase.

## 1. Preparar a VPS (uma vez)
Ubuntu 22.04/24.04, mínimo 2 vCPU e 4 GB de RAM (o filme gasta CPU).
```bash
ssh root@IP_DA_VPS
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
git clone https://github.com/JohniGomes/automacao-arquitetura.git /opt/croqui
cd /opt/croqui
```
(repositório privado: use um deploy key ou `gh auth login` antes do clone.)

## 2. Variáveis de ambiente
Crie `/opt/croqui/.env` com as **mesmas** variáveis que estão hoje no Render (Supabase, Gemini, Asaas, Resend, Google, VAPID, ADMIN_EMAILS...), mais:
```
APP_URL=https://appcroqui.com.br
MOCK_MODE=false
NODE_ENV=production
```
`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` e `NEXT_PUBLIC_CONTACT_EMAIL` entram no build (o compose lê do mesmo `.env`). Não use aspas nos valores e não defina `DATA_DIR`.

## 3. Subir
```bash
cd /opt/croqui && ./deploy/deploy.sh
```

## 4. DNS
No DNS do domínio (Kinghost), aponte para o IP da VPS:
- `A` `appcroqui.com.br` → IP da VPS
- `A` `www` → IP da VPS
Remova os registros que apontavam para o Render. O Caddy pega o certificado assim que o DNS propagar. Login do Google, webhook do Asaas e chaves do Maps não mudam (o domínio é o mesmo).

## 5. Atualizar depois de cada merge
```bash
ssh root@IP_DA_VPS 'cd /opt/croqui && ./deploy/deploy.sh'
```

## Dicas
- Logs: `docker compose logs -f app`
- Reiniciar: `docker compose restart app`
- Fila de gerações: `JOBS_CONCURRENCY=2` (padrão); com 4+ vCPU pode subir para 4.
- Backup: nada local importa (tudo no Supabase). Guarde uma cópia do `.env`.
