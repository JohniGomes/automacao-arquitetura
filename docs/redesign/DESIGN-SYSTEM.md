# Croqui — Design System

Versão 0.1 (fases 1 e 2 do redesign). Fonte das decisões: `app/tokens.css`. Primitivas novas: `app/ui.css`.

## Princípios

1. **Clareza antes de enfeite.** Cada tela tem uma ação principal; ela é a única em terracota cheia.
2. **Conteúdo como protagonista.** Cartões só quando agrupam algo; listas e espaço em branco primeiro.
3. **Mobile primeiro.** Todo elemento tocável tem pelo menos 44 px; campos usam 16 px no celular (evita o zoom do iOS).
4. **Feedback imediato.** Toda ação responde na hora: estado de carregando, toast ou mudança visível.
5. **Vidro com propósito.** `backdrop-filter` só em barras fixas e folhas inferiores, onde há conteúdo passando por trás.
6. **Acessível por padrão.** Contraste mínimo de 4,5:1 no texto, foco visível, `prefers-reduced-motion` respeitado.

## Marca

| Elemento | Decisão | Justificativa |
|---|---|---|
| Nome | Croqui | O esboço rápido do arquiteto: o ponto de partida do produto |
| Símbolo | Casa em traço, telhado que passa dos pilares, chão e ponto em terracota | Remete ao desenho à mão; o ponto é a "faísca" da IA |
| Cores | Papel, areia, grafite e terracota | Cultura de papel e traço; diferencia dos apps de IA azuis e roxos |
| Tipografia | Fraunces (títulos e números de destaque), Inter (interface) | A serifada dá personalidade; a sans garante leitura |
| Tom de voz | Curto, no verbo, sem exclamação | "Gerar render", não "Clique aqui para gerar!" |

## Tokens

### Cor (claro / escuro)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--color-primary` | `#BC4E34` | `#BC4E34` | Ação principal (texto claro por cima: 4,9:1) |
| `--color-primary-hover` | `#A8432B` | `#A8432B` | Hover e pressionado |
| `--color-accent` | `#C4553A` | `#E07A5F` | Detalhes, ícones, destaques gráficos |
| `--color-secondary` | `#2B2A28` | `#F4EFE8` | Ênfase e ações secundárias |
| `--color-bg` | `#F4EFE8` | `#1F1E1C` | Fundo da página |
| `--color-surface` | `#FBF8F3` | `#2A2825` | Cartões e painéis |
| `--color-surface-elevated` | `#FFFDF9` | `#33312D` | Menus, folhas, diálogos, toasts |
| `--color-text` | `#2B2A28` | `#EAE4DA` | Texto principal |
| `--color-text-secondary` | `#5A564F` | `#B9B2A6` | Texto de apoio |
| `--color-border` | 12% grafite | 12% papel | Linhas finas |
| `--color-success` | `#2D6B47` | `#6CC08F` | Confirmações |
| `--color-warning` | `#8A5A00` | `#E3B341` | Avisos |
| `--color-error` | `#B3261E` | `#FF8F84` | Erros |
| `--color-info` | `#2F5D8A` | `#7FB2E5` | Informações |

Regra: terracota (`--color-accent`) não vale como cor de texto pequeno sobre papel (3,9:1). Para texto e links use
`--color-link`.

### Tipografia

| Token | Valor | Uso |
|---|---|---|
| `--text-xs` / `sm` / `base` / `md` | 12 / 13 / 15 / 16 px | Legenda, apoio, corpo do app, campos no celular |
| `--text-lg` / `xl` / `2xl` / `3xl` | 20 / 24 / 32 / 44 px | Títulos (3xl só na landing) |
| `--weight-regular` / `medium` / `semibold` | 400 / 500 / 600 | |
| `--leading-tight` / `snug` / `body` | 1,15 / 1,35 / 1,55 | |

### Espaçamento, forma e movimento

- Espaço: `--space-1` a `--space-16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px).
- Raio: `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 16, `--radius-pill` 999.
- Alvo de toque: `--control-h` 44 px.
- Movimento: `--dur-fast` 120 ms, `--dur-base` 200 ms, `--ease-out`.
- Camadas: `--z-bar` 50, `--z-sheet` 60, `--z-toast` 80, `--z-lightbox` 90.

## Componentes

Status: **novo** já usa os tokens semânticos; **legado** funciona e herda os tokens por apelidos, mas será migrado.

| Componente | Classe ou arquivo | Status |
|---|---|---|
| Botão (primário, `.ghost`) | `button`, `.btn` | legado |
| Campo, seleção, área de texto | `input`, `select`, `textarea` | legado |
| Cartão | `.card` | legado |
| Selo | `.tag` | legado |
| Aviso | `.warn`, `.alert` | legado |
| Chip e segmento | `.chip`, `.seg` | legado |
| Menu lateral e barra inferior | `.rail`, `.ritem` | legado |
| Esqueleto de carregamento | `.skel`, `.skel-card`, `app/app/loading.tsx` | novo |
| Tela de estado (erro, 404) | `components/StateView.tsx`, `.statepage` | novo |
| Toast | `components/Toast.tsx`, `useToast()`, `.toast` | novo |
| Ícones em dois tons | `components/icons.tsx` | novo |

### Estados

Todo componente interativo define: padrão, hover, foco (`:focus-visible` com contorno de 2 px terracota), ativo, desabilitado
e carregando (`aria-busy`). Erros mostram texto, não só cor.

### Como usar um toast

```tsx
const toast = useToast();
toast(t("Projeto atualizado"));          // sucesso
toast(t("Não foi possível salvar"), "error");
```

### Como criar um componente novo

1. Use só tokens `--color-*`, `--space-*`, `--radius-*`, `--text-*`.
2. Garanta 44 px de altura nos elementos tocáveis.
3. Teste em modo claro e escuro e em 360 px.
4. Adicione as strings em `lib/en.ts` e rode `node scripts/check-i18n.mjs`.

## Estados do sistema (fase 2)

- `app/app/loading.tsx`: esqueleto das telas do app.
- `app/app/error.tsx` e `app/error.tsx`: erro com "Tentar de novo" (convenção do Next 16: `retry`).
- `app/not-found.tsx`: 404 na marca, com o status HTTP 404 correto.
- `app/manifest.ts` e `public/icons/`: app instalável na tela inicial.
- `viewport.themeColor` e `appleWebApp`: a barra do navegador acompanha a marca no claro e no escuro.

## Próximas fases

Navegação mobile (barra de 4 abas, folha "Criar", tela "Conta"), fluxo das ferramentas, início e onboarding, e a migração dos
componentes legados para `ui.css`. Ver `AUDITORIA.md`.
