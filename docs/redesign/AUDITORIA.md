# Croqui — auditoria de UX/UI e proposta de direção

Data: 2026-11-12. Escopo: app web em Next.js 16 (App Router), tema atual "papel e terracota" já publicado.
Método: leitura do código, medições no navegador (360, 390, 768 px e desktop) e revisão manual das telas principais.
Limites: não testei em aparelhos reais, não rodei Lighthouse nem leitor de tela, e a página das diretrizes da Apple
(developer.apple.com/design) não é legível por ferramenta (carrega por JavaScript). Os princípios da Apple citados vêm
do conhecimento geral e devem ser conferidos na fonte.

## 1. Como o produto está hoje

| Item | Situação |
|---|---|
| Stack | Next.js 16, React 19, TypeScript, Supabase, Asaas, Gemini. Sem biblioteca de UI. |
| Telas | Landing, login/cadastro/recuperação, 10 ferramentas, projetos, gerações, créditos/planos, ajuda, suporte. |
| CSS | 3 arquivos (`globals.css`, `rail.css`, `croqui.css`), cerca de 800 linhas. `croqui.css` sobrescreve os outros por especificidade. |
| i18n | PT/EN com 484 textos, checados por script. Bom. |
| Acessibilidade | 104 atributos ARIA, foco visível, `prefers-reduced-motion` respeitado. Base boa. |
| Mobile em 360 px | Sem rolagem lateral nas telas medidas (depois das correções de hoje). |

## 2. Diagnóstico, com gravidade

Gravidade: alta (prejudica o uso), média (atrapalha), baixa (acabamento).

### Alta

1. **Sem tela de carregamento, erro ou "não encontrado".** Não existem `loading.tsx`, `error.tsx` nem `not-found.tsx`.
   A página 404 é a padrão do Next, em inglês e sem marca. Trocar de tela não mostra nada até a resposta chegar.
   Recomendação: esqueletos (skeletons) por tela, página de erro e 404 na marca, em PT/EN.
2. **Navegação mobile esconde o essencial.** Na barra de baixo, "Conta" abre um popover com Ajuda, Suporte, Idioma, Tema,
   Termos e Sair. O saldo de créditos não aparece na barra do celular. "Ferramentas" abre uma gaveta com 10 itens e busca.
   Criar algo leva 2 toques e uma lista longa.
   Recomendação: barra de 4 abas (Início, Criar, Projetos, Conta), "Criar" como folha inferior (bottom sheet) com as
   ferramentas agrupadas, e "Conta" como tela inteira em vez de popover.
3. **Fluxo das ferramentas é um formulário longo.** Render tem painel de opções com 8 ou mais controles em coluna única. No
   celular, o bloco "Custo total + Gerar" fica grudado por cima do conteúdo, cobrindo campos enquanto se rola.
   Recomendação: barra de ação fixa no rodapé (custo e botão), opções avançadas recolhidas, resultados em tela cheia.
4. **Dívida de estilo.** Os nomes dos tokens são herdados do tema antigo (`--sage` agora é terracota, `--deep` é grafite)
   e as regras novas vivem em camadas de sobrescrita. Já gerou bugs reais: botões de menu viravam terracota ao passar o
   mouse, e as setas dos selects eram diferentes entre telas. Qualquer componente novo tem risco de ficar fora do padrão.
   Recomendação: tokens semânticos (`--color-primary`, `--surface-elevated`...) e um arquivo de componentes único.

### Média

5. **Início com muitos blocos.** Busca, 3 cartões em destaque, atalhos, fixados, projetos, resumo de saldo e "Primeiros
   passos" competem entre si. Em 360 px são cerca de 4 telas de rolagem.
   Recomendação: um bloco principal ("Criar") e uma lista de recentes. Saldo no cabeçalho.
6. **Alvos de toque pequenos.** Na home em 360 px, 6 elementos têm menos de 36 px de altura (links "Ver todos", chips).
   O mínimo de 44 px só vale para `.shell button`.
   Recomendação: 44 px em todo elemento tocável no celular.
7. **Sem retorno de confirmação.** Não há toasts: favoritar, salvar no projeto, copiar e cancelar mudam o estado sem aviso.
   Recomendação: toast leve e discreto, com `aria-live`.
8. **Controles segmentados em telas médias.** Em 768 px, "Quantas versões" quebra em "1, 2, 3 / 4" (observado).
   Recomendação: segmentos em linha única, com rolagem horizontal só se faltar espaço.
9. **Sem manifesto de app instalável.** Não há `manifest`, `theme-color` nem metatags de app para tela de início.
   No celular a barra do navegador não combina com a marca.
10. **Formulários.** Login e cadastro têm `autoComplete`, mas não há botão mostrar/ocultar senha e os demais campos não
    declaram `inputMode`/`enterKeyHint`.

### Baixa

11. **Nome em transição.** A interface diz Croqui; termos, privacidade, e-mails e descrição das cobranças ainda dizem ArqIA.
    Depende da decisão do domínio.
12. **Desempenho.** `render.jpg` da landing tem 301 KB, sem `sizes` nem formato moderno. `backdrop-filter` em barras fixas
    custa em celulares simples; manter só onde há ganho (barra inferior e folhas).
13. **75 estilos inline** em componentes: pequenos desvios que escapam do padrão.

## 3. Direção de marca (o que fica e por quê)

Mantemos Croqui, papel, grafite e terracota. Justificativa estratégica:
- O público é de arquitetos: cultura de papel, traço e prancha. Terracota sobre papel diferencia de apps de IA azul/roxo e
  comunica ofício, não novidade.
- Grafite e papel dão contraste alto e leitura longa confortável. Terracota fica reservada à ação principal e ao destaque,
  nunca ao fundo.
- Serifada (Fraunces) só em títulos e números de destaque; Inter em toda a interface, para clareza.
- Vidro fosco só em barras fixas e folhas inferiores (onde há conteúdo passando por trás). Nenhum gradiente decorativo.

## 4. Proposta de implementação, em fases seguras

Estratégia: trabalhar numa branch separada (`redesign-ux`) num worktree próprio, sem tocar na `main` até validar. O Render só
publica a `main`.

| Fase | Entrega | Risco |
|---|---|---|
| 1. Fundação | Tokens semânticos (`tokens.css`), arquivo único de componentes (`ui.css`), `DESIGN-SYSTEM.md`, aliases para os nomes antigos | baixo |
| 2. Estados do sistema | `loading.tsx` com skeletons, `error.tsx`, `not-found.tsx`, toasts, manifesto e `theme-color` | baixo |
| 3. Navegação mobile | Barra de 4 abas, folha "Criar", tela "Conta", cabeçalho com título grande e saldo | médio (muda rotas visíveis, não as APIs) |
| 4. Fluxo das ferramentas | Barra de ação fixa, opções avançadas recolhidas, resultado em tela cheia | médio |
| 5. Início, login, onboarding | Início enxuto, senha com mostrar/ocultar, teclado certo por campo | baixo |
| 6. Testes | 360/375/390/414/430/768/1024/1280/1440, fluxos de login, cadastro, geração e pagamento, contraste | baixo |

Não vou alterar: APIs, autenticação, regras de cobrança, banco de dados, e-mail, integrações.
