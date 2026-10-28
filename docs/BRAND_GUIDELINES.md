# BRAND_GUIDELINES.md — Identidade visual oficial HiCash

## Objetivo

Aplicar a identidade HiCash sem refatorar a arquitetura nem alterar regras de negócio. A marca comunica clareza, confiança, controle financeiro e um assistente de chat amigável.

## Ativos oficiais

- Logo (tema claro): `/brand/logo-hicash-light.webp` (fallback `.png`).
- Logo (tema escuro): `/brand/logo-hicash-dark.webp` (fallback `.png`).
- Símbolo isolado: `/brand/mark-hicash.png`.
- Mascote completo do login: `/brand/mascot-login.webp` (fallback `.png`), exclusivo do painel institucional da tela de login. Preservar os arquivos compactos do chat.
- Favicon: `/favicon.ico` e PNG 16/32.
- Ícones de app: `/icon-192.png`, `/icon-512.png`.

## Paleta

| Papel | Hex | Uso |
|---|---|---|
| Verde primário da interface | `#16A34A` | Navegação ativa, seleção e acentos |
| Verde hover | `#15803D` | Hover e destaque mais forte |
| Verde pressionado | `#166534` | Estado ativo e ações de alto contraste |
| Verde suave | `#EAF8EF` | Fundos suaves e badges no tema claro |
| Verde discreto | `#F0FDF4` | Destaques leves no tema claro |
| Texto principal | `#172B24` | Texto no tema claro |
| Cinza secundário | `#64748B` | Metadados e subtítulos |
| Fundo claro | `#F8FAF9` | Canvas da aplicação |
| Superfície | `#FFFFFF` | Cards e controles |
| Borda | `#E2E8E5` | Divisórias e limites de superfície |
| Despesa / danger | `#DC2626` | Valor de despesa e referência para ações destrutivas |
| Fundo danger | `#FEF2F2` | Hover e feedback destrutivo suave |
| Fundo escuro | `#111A16` | Aplicação em tema escuro |

Os tokens semânticos ficam em `frontend/src/styles/hicash-brand-tokens.css` e alimentam o tema Tailwind. Ações com texto branco usam o tom `#15803D` como fundo e `#166534` no hover para preservar contraste; `#16A34A` continua sendo a cor primária oficial da interface. O tema escuro tem superfícies, bordas e cores financeiras próprias. Usar verde em ações principais e estados selecionados, sem tingir todas as superfícies. Despesas mantêm cor semântica distinta. Os arquivos gráficos oficiais não são recoloridos para acompanhar os tokens.

Arredondamentos de referência: cards 10px, controles 7px, modais 12px, elementos pequenos 5px. Sombras e bordas devem separar superfícies discretamente.

## Aplicações

### Interface autenticada

- A referência visual de acabamento é `docs/design/login-final-reference.png`; seu layout split, CSS e ativos não são reutilizados literalmente nas páginas internas.
- Navegação ativa: acento verde primário e fundo sutil. Perfil: avatar com iniciais e dados reais da autenticação; logout neutro com hover danger.
- Controles de seleção usam `AppSelect` baseado em Radix; o seletor de período preserva `YYYY-MM`. Cards, inputs e dropdowns usam raios moderados e sombras proporcionais à elevação.
- Chat lateral e página completa compartilham cabeçalho, bolhas e cards. Avatares usam `mark-hicash.png`; cards de operação exibem exclusivamente dados confirmados pelo backend.
- Despesas, erros, exclusões e alertas têm papéis visuais distintos. Equivalentes do tema escuro estão nos tokens; valores monetários usam números tabulares.

- Menu lateral: logo correspondente ao tema; em layout compacto usar o símbolo isolado.
- Tela do chatbot: usar `mark-hicash.png` nos avatares pequenos. O mascote completo pertence apenas ao login e não substitui os ativos do chat.
- Tela de login: reproduzir exclusivamente a referência definitiva aprovada em `docs/design/login-final-reference.png` e suas orientações em `docs/design/README.md`. A especificação anterior em `docs/LOGIN_VISUAL_SPEC.md` é histórica e não orienta novos ajustes visuais.
- Chat flutuante: marca discreta no cabeçalho; não repetir ilustração grande em cada mensagem.
- Favicon e títulos HTML: HiCash, não Vite/React/Laravel.
- Dashboard: cores semânticas para receitas, despesas, saldos e alertas; verde de marca não deve confundir estados financeiros.

## Acessibilidade / desempenho

- Definir `alt` para imagens informativas, usar `alt=""` para decorativas.
- Estabelecer width/height/aspect ratio, evitar layout shift.
- Preferir WebP no chat; usar lazy loading para ilustração abaixo da dobra.
- Favicon do navegador pode ser PNG/ICO; evitar mascote 3D em tamanhos 16px.
- Garantir contraste WCAG para botões, textos e foco, tanto no tema claro quanto no escuro.

## Aprovação e escopo

A implementação da marca NÃO deve modificar comportamentos de cadastro, relatórios, interpretações do chatbot, API ou banco de dados. Registrar o novo padrão visual em `DECISIONS.md` e o andamento em `PROGRESS.md`, quando presentes.
