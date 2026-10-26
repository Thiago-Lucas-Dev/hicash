# Sistema financeiro pessoal (nome a definir)

## Objetivo

Aplicação web local para um usuário registrar e acompanhar receitas, despesas, contas, categorias e orçamentos. Seu diferencial é um assistente em JavaScript que interpreta comandos financeiros em português sem depender de uma API de IA. Laravel valida e executa todas as operações.

## Escopo da primeira versão

- Dashboard com saldos efetivo e previsto, receitas e despesas mensais, gráficos por categoria, comparação mensal, evolução, movimentações recentes e limites.
- Contas com saldo inicial e transferências internas; movimentações com status pendente ou concluído, data de referência, forma de pagamento e origem.
- Categorias iniciais, classificação essencial e não essencial, associações aprendidas; orçamentos mensais por categoria com alertas configuráveis.
- Chat em página própria e painel flutuante com histórico único, respostas textuais e componentes estruturados.
- Recorrências cadastradas por formulário e geradas como pendentes pelo Laravel Scheduler.
- Configurações de contas, padrões, preferências e tema claro/escuro. Interface para desktop e celular.

Valores por extenso, faturas de cartão e IA externa ficam fora da primeira versão. A publicação adiciona autenticação segura para um único usuário, sem cadastro público. Despesas no cartão entram nos relatórios e orçamentos, mas não reduzem imediatamente o saldo bancário. A interface informa essa limitação.

## Tecnologias

React, TypeScript, Vite, Tailwind CSS e shadcn/ui no frontend; motor do chatbot em módulos JavaScript independentes; Laravel com API REST; MySQL; Vitest, testes Laravel e testes de ponta a ponta. Ambiente inicial local, moeda BRL e fuso `America/Sao_Paulo`.

## Critérios de conclusão

Telas funcionais com dados persistidos; comandos suportados executados sem IA; saldos e limites consistentes; recorrências sem duplicação; ambiguidades resolvidas antes de operações arriscadas; contexto entre mensagens; experiência responsiva; testes principais passando.

Consulte `ARCHITECTURE.md` para integração e dados, `CHATBOT_SPEC.md` para comportamento do assistente, `DECISIONS.md` para justificativas e `PROGRESS.md` para o estado do trabalho.
