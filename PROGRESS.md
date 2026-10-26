# Progresso

## Estado atual

- Etapa 0 — Documentação e arquitetura: concluída inicialmente; revisar conforme a implementação.
- Etapa 1 — Fundação técnica: projetos React/Vite e Laravel criados; API, migrations, cliente HTTP e conexão MySQL integrados e validados.
- Etapa 2 — Sistema financeiro: CRUD de contas, categorias, movimentações e transferências; cálculos de saldo, status, exclusão lógica e auditoria implementados.
- Etapa 3 — Dashboard e orçamentos: indicadores, gráficos, comparação mensal, limites e alertas implementados.
- Etapa 4 — Chatbot básico: módulos JS, registros, consultas e respostas implementados.
- Etapa 5 — Chatbot avançado: contexto recente, complemento de descrição, correção, exclusão confirmada, desfazer, comandos múltiplos e associações implementados.
- Etapa 6 — Recorrências: formulário, scheduler, recuperação, edição de ocorrência e alteração das futuras com proteção contra duplicatas implementados.
- Etapa 7 — Validação e acabamento: 16 testes Laravel (76 asserções), 11 testes Vitest, build de produção, cache de produção Laravel, fluxo Chrome completo em banco descartável, teste visual de leitura no MySQL e teste transacional da API no MySQL passando.

## Pendências e próximos passos

Preparação de produção implementada: autenticação individual, rotas protegidas, healthcheck, comando de recorrências, proxy same-origin, fallback SPA, configuração Vercel/Railway e documentação. O projeto Vercel `thiago-086d/hicash` foi criado, mas a conexão GitHub ainda requer uma Login Connection. A criação da conta Railway está bloqueada pela mensagem da plataforma `Sign ups are currently disabled. Please try again later.`; por isso ainda não há API, MySQL, Cron, URLs públicas ou smoke tests remotos. A continuidade do Railway Cron após o trial depende de autorização de custo.

## Problemas encontrados

O primeiro scaffold Vite criou um template JavaScript simples; foi convertido para React/TypeScript. Um teste detectou que a validação inicial descartava os itens de comandos múltiplos; o contrato foi corrigido. O teste de navegador revelou uma conversão incorreta de UTF-8 no frontend; ela foi reparada. O comando opcional `php artisan db:show` requer a extensão PHP `intl`, que existe na instalação local mas não está ativada por padrão; a API e a interface funcionaram sem ela. Para usar esse comando, execute `php -d extension=php_intl.dll artisan db:show --counts`.
