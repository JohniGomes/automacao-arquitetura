# ArqIA — MVP de IA para arquitetos

App web (pt-BR) que automatiza o fluxo manual da apresentação "Inteligência Artificial na Arquitetura":

1. **Mapa de situação** — endereço → satélite (Google Maps Static API) → Gemini gera o mapa ilustrado com comércio/serviços. Aceita upload de print próprio.
2. **Moodboard** — modelo da galeria do app (ou print do Pinterest enviado) + ambiente (cozinha/sala/banheiro/quarto) + casa de referência.
3. **Render a partir de print** — 4 versões fotorrealistas, prompt padrão editável que preserva a geometria.
4. **Variação de iluminação** — manhã, golden hour, blue hour, noite ou luz livre.
5. **Filme do projeto** — 1 a 5 cenas: imagem (Gemini) → clipe (Gemini Omni) → MP4 1920x1080 montado com ffmpeg, com fila e barra de progresso.

Transversal: login (e-mail/senha e Google), créditos por ação com estorno em falha, histórico com download, chaves só no servidor, modo mock sem chaves, avisos de responsabilidade técnica e de termos do Google Maps.

## Stack (e por quê)

Next.js 16 (App Router) + TypeScript, um único projeto front+back. Persistência **local em arquivos** (`data/db.json` + `data/files/`) para rodar sem infraestrutura; `sharp` para imagens; `ffmpeg-static` (binário embutido, sem instalar ffmpeg); fila em memória (2 jobs simultâneos). Sessão por cookie HMAC assinado; senha com scrypt.
**Para produção** troque: JSON → Postgres/Supabase, arquivos → S3/Supabase Storage, fila em memória → BullMQ/Redis ou worker separado (a fila atual perde jobs em reinício — eles são marcados como erro e estornados), e use um segredo de sessão forte.

## Como rodar

```bash
cd app-ia-arquitetura
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev                     # http://localhost:3000
```

Sem chaves o app entra em **modo mock** automaticamente (faixa amarela no topo): devolve imagens-placeholder e um vídeo real gerado pelo ffmpeg a partir delas. Crie uma conta na tela inicial (ganha `SIGNUP_CREDITS`, padrão 100).

### Configurar as chaves (`.env.local`)

| Variável | Como obter |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio → API keys](https://aistudio.google.com/apikey). Imagem e vídeo usam a mesma chave; geração de vídeo/imagem exige faturamento ativo. |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → projeto com faturamento → habilitar **Maps Static API** → criar chave (restrinja à API e, em produção, ao IP do servidor). |
| `GOOGLE_CLIENT_ID/SECRET` | (opcional) Console → OAuth consent + credencial "Web"; redirect URI `http://localhost:3000/api/auth/google/callback`. |
| `GEMINI_IMAGE_MODEL` / `GEMINI_VIDEO_MODEL` | Padrões `gemini-nano-banana-2.1` e `gemini-omni-1.1-flash`. Mude aqui se o Google renomear. |
| `MOCK_MODE` | `auto` (padrão), `true` força mock, `false` exige chaves. |

### Modelos de moodboard

Coloque as imagens de referência em `templates/moodboards/` (ver `LEIA-ME.md` da pasta). Os `modelo-exemplo-*.jpg` são placeholders (`npm run seed:templates` os recria): substitua pelos seus.

## Fontes consultadas (28/10/2026) e o que mudou em relação ao planejado

- Imagem — <https://ai.google.dev/gemini-api/docs/image-generation>: modelo recomendado `gemini-nano-banana-2.1` (também `gemini-3.1-flash-image`, `gemini-3-pro-image`; `gemini-2.5-flash-image` é legado). Chamada pela **Interactions API** (`POST /v1beta/interactions`, `response_format` com `aspect_ratio` e `image_size`).
- Vídeo — <https://ai.google.dev/gemini-api/docs/video> e <https://ai.google.dev/gemini-api/docs/omni.md.txt>: **os modelos Veo 3.1 preview foram desativados em 22/10/2026**; a doc recomenda `gemini-omni-1.1-flash` (imagem→vídeo, 16:9, até 1080p, entrega por URI + polling do arquivo). **Por isso o app usa Gemini Omni Flash, não Veo.** Essa doc não expõe parâmetro de duração na geração: o app corta cada clipe em `CLIP_SECONDS` (padrão 5 s) no ffmpeg.
- Mapas — <https://developers.google.com/maps/documentation/maps-static/start>: `maptype=satellite`, máx. 640x640 @2x (1280x1280).
- Preços — <https://ai.google.dev/gemini-api/docs/pricing>.

## Custos e limites conhecidos (a conferir antes de precificar)

Valores lidos da página de preços na data acima (podem mudar):
- `gemini-nano-banana-2.1`: US$ 0,0336 (1K), 0,0504 (2K), 0,113 (4K) por imagem. O app usa `GEMINI_IMAGE_SIZE=1K`.
- `gemini-omni-1.1-flash`: ~US$ 0,10 por segundo de vídeo. A duração do clipe gerado não é controlável pela API e **pode ser maior que os 5 s que o app aproveita** (custo real a medir).
- Maps Static API: preço não consta na página consultada — conferir na tabela de preços do Google Maps Platform.
- Estimativa por ação (só IA, sem Maps), com os valores acima: mapa ≈ 1 imagem; render ≈ 4 imagens; luz ≈ 1 imagem; filme de 5 cenas ≈ 5 imagens + 5 clipes (**o item mais caro**, ordem de grandeza de US$ 2,5+ se cada clipe tiver ~5 s).
- Cada geração grava em `data/db.json` o consumo (`usage.images`, `usage.videoClips`) para você **medir antes de definir preços**. Os créditos em `lib/costs.ts` (mapa 3, moodboard 3, render 4/imagem, luz 3, filme 13/cena) são **valores provisórios**, não calibrados.
- Limites do Omni (doc): sem prompt negativo/parâmetros de temperatura; imagens de menores no EEE/Suíça/Reino Unido e de pessoas reconhecíveis não são aceitas; inglês é o idioma plenamente suportado (os prompts do app são em inglês).
- **Fidelidade da geometria é o principal risco de qualidade**: o prompt pede preservação, mas não há garantia; o render deve ser sempre conferido contra o modelo.
- Upload limitado a 15 MB/imagem; imagens são reduzidas a 2048 px e enviadas como JPEG ao Gemini.
- Não há limite de taxa por usuário nem proteção contra abuso/CSRF além do cookie `SameSite=Lax` — endurecer antes de publicar.

## Termos do Google Maps

A imagem de satélite vem da Static API e é exibida com a atribuição "Imagens © Google · Dados do mapa © Google e provedores" e link aos Termos. **Não validei juridicamente** se os termos da Google Maps Platform permitem reprocessar a imagem com IA generativa, armazená-la no histórico e entregá-la ao cliente final — isso precisa de revisão dos *Service Specific Terms* antes de lançar comercialmente. A opção de subir o próprio print continua disponível, mas o print do Google Earth/Maps tem as mesmas restrições de uso do Google.

## Cobrança (a preparar)

O sistema de créditos funciona (saldo, débito na criação, estorno em falha, extrato em `/app/creditos`). A compra **não cobra**: `POST /api/billing/checkout` devolve 501. Caminho previsto: Stripe Checkout / Mercado Pago (Pix) criando sessão por pacote + webhook assinado que credita o usuário. Variáveis reservadas no `.env.example`.

## O que foi validado e o que não foi

**Validado localmente (modo mock):** `npm run build` e `tsc` sem erros; cadastro/login/sessão; as cinco funcionalidades de ponta a ponta via HTTP (mapa, moodboard com modelo da galeria, render 4 versões, luz, filme com 2 cenas); MP4 final conferido com ffmpeg (1920x1080, H.264, 24 fps, 10 s para 2 cenas de 5 s); débito de créditos (conferido o saldo) e rotas protegidas (401/redirect); tela do mapa no navegador (validação, geração, progresso, resultado, avisos legais, créditos atualizados).

**NÃO testado (faltam chaves/contas):**
- Qualquer chamada real ao Gemini (imagem e vídeo): o formato do payload segue a documentação, mas o parser da resposta (`lib/gemini.ts`, `findMedia`) é tolerante porque a documentação mostra formatos diferentes entre SDK e REST (`output_image` vs `steps[].content[]`). O polling/download do vídeo por `files/{id}` também não foi exercitado. **Espere ajustes no primeiro teste real.**
- Google Maps Static API real e o login com Google (OAuth).
- Estorno parcial: se uma geração falha no meio, o estorno integral só ocorre quando nada utilizável saiu.
- Telas moodboard/render/luz/filme foram validadas pela API e compilam, mas só a tela do mapa foi exercitada visualmente no navegador.
- Cobrança (não implementada), concorrência alta, deploy.

## Vercel + Supabase (próximo passo)

O app **não roda como está na Vercel**: ela tem sistema de arquivos efêmero (o `data/db.json` e `data/files/` se perdem), a fila é em memória e funções serverless têm tempo limite (o filme leva minutos). Para publicar: usuários/créditos/histórico → Supabase Postgres (+ Supabase Auth no lugar do login atual), arquivos → Supabase Storage, e a geração (principalmente o filme) em um worker/fila externo (ex.: Supabase Edge + fila, Inngest, ou um serviço Node em Railway/Fly com ffmpeg).

## Deploy no Render (Opção 1: instância única com disco persistente)

1. Suba o repositório no GitHub e, no Render, **New + > Blueprint** apontando para ele (usa `render.yaml`). Plano pago, pois o disco persistente (`/var/data`) não existe no plano grátis.
2. Preencha as variáveis marcadas como `sync: false`: `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `APP_URL` (URL final) e, se usar login Google, `GOOGLE_CLIENT_ID/SECRET` (cadastre `APP_URL/api/auth/google/callback` como redirect URI).
3. `SIGNUP_CREDITS=0` em produção: cadastro aberto com crédito grátis é gasto direto de API. Dê créditos manualmente a usuários de teste editando `/var/data/db.json` (shell do Render) até a cobrança existir.
4. Restrinja a chave do Maps à Static API. Faça backup periódico do disco (snapshots do Render).

**Qualidade do vídeo:** `CLIP_SECONDS=0` mantém cada clipe inteiro como o Gemini devolveu (sem corte); o ffmpeg reencoda com H.264 `-preset slow -crf 16` e redimensionamento lanczos para 1920x1080; a chamada ao Gemini usa timeouts sem limite para não abortar gerações longas. O Render não altera a qualidade: ela depende do modelo e da imagem de entrada.
**Limites desta opção:** uma única instância (sem escala horizontal), fila em memória (deploy/reinício durante uma geração a interrompe e estorna os créditos), indisponibilidade breve a cada deploy por causa do disco.
