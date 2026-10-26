# BRAND_GUIDELINES.md — Identidade visual oficial HiCash

## Objetivo

Aplicar a identidade HiCash sem refatorar a arquitetura nem alterar regras de negócio. A marca comunica clareza, confiança, controle financeiro e um assistente de chat amigável.

## Ativos oficiais

- Logo (tema claro): `/brand/logo-hicash-light.webp` (fallback `.png`).
- Logo (tema escuro): `/brand/logo-hicash-dark.webp` (fallback `.png`).
- Símbolo isolado: `/brand/mark-hicash.png`.
- Mascote principal do assistente: `/brand/mascot-chat.webp`.
- Favicon: `/favicon.ico` e PNG 16/32.
- Ícones de app: `/icon-192.png`, `/icon-512.png`.

## Paleta

| Papel | Hex | Uso |
|---|---|---|
| Verde primário | `#22C55E` | Marca, CTAs e seleção |
| Verde hover | `#16A34A` | Hover/active e contraste |
| Verde menta | `#DCFCE7` | Fundos suaves e badges |
| Grafite | `#1F2937` | Texto no tema claro |
| Cinza secundário | `#6B7280` | Metadados e subtítulos |
| Fundo claro | `#F3F4F6` | Superfícies e separações |
| Fundo escuro | `#111827` | Aplicação em tema escuro |

Os tokens de design devem ser integrados à **configuração de tema já existente** (Tailwind/shadcn ou equivalente), mantendo semântica e contraste. Não substituir todas as cores do sistema por verde; usar verde sobretudo em ações primárias e acentos. Despesas devem manter cor semântica de alerta/despesa, receitas cor positiva, sem depender exclusivamente da cor.

## Aplicações

- Menu lateral: logo correspondente ao tema; em layout compacto usar o símbolo isolado.
- Tela do chatbot: usar `mark-hicash.png` nos avatares pequenos. O mascote atual não deve aparecer na interface.
- Uma nova versão do mascote poderá ser usada exclusivamente na tela de login em uma mudança futura.
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
