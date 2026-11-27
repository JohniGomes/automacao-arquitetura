#!/usr/bin/env bash
# Atualiza o Croqui na VPS: puxa a main, reconstrói e reinicia. Rode dentro da pasta do projeto: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only origin main
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
