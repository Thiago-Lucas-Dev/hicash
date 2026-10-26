# Progresso

## Estado atual

- Etapa 0 — Documentação e arquitetura: concluída inicialmente; revisar conforme a implementação.
- Etapa 1 — Fundação técnica: projetos React/Vite e Laravel criados; API, migrations, cliente HTTP e conexão MySQL integrados e validados.
- Etapa 2 — Sistema financeiro: CRUD de contas, categorias, movimentações e transferências; cálculos de saldo, status, exclusão lógica e auditoria implementados.
- Etapa 3 — Dashboard e orçamentos: indicadores, gráficos, comparação mensal, limites e alertas implementados.
- Etapa 4 — Chatbot básico: módulos JS, registros, consultas e respostas implementados.
- Etapa 5 — Chatbot avançado: contexto recente, complemento de descrição, correção, exclusão confirmada, desfazer, comandos múltiplos e associações implementados.
- Etapa 6 — Recorrências: formulário, scheduler, recuperação, edição de ocorrência e alteração das futuras com proteção contra duplicatas implementados.
- Etapa 7 — Validação e acabamento: 8 testes Laravel, 6 testes Vitest, build de produção, fluxo Chrome completo em banco descartável, teste visual de leitura no MySQL e teste transacional da API no MySQL passando.

## Pendências e próximos passos

Preparação de deploy: autenticação de sessão, proxy Vercel, imagem Northflank, comandos de usuário e recorrências, exemplos de ambiente e `DEPLOYMENT.md` adicionados. Login nas duas plataformas confirmado. Projeto Vercel `thiago-086d/hicash` criado e configurado na conta Hobby; ainda não publicado. A equipe Northflank ainda não tem projetos nem repositórios conectados, e o saldo de créditos é zero. Publicação de produção depende da decisão sobre custos; o Sandbox gratuito Northflank não é recomendado pela plataforma para produção. URLs públicas ainda não existem. Crie o usuário inicial antes do primeiro login.

Identidade oficial HiCash integrada ao frontend: logos por tema, símbolo, paleta semântica, favicon e ícones. O mascote atual permanece apenas como arquivo, sem uso na interface; uma futura versão poderá aparecer exclusivamente no login.

Validação visual da marca: login claro, dashboard e chat escuros, painel flutuante nos dois temas e viewport móvel verificados em prévia local do build. Logos WebP, símbolo, favicons, ícones e manifesto responderam HTTP 200; não houve requisição ao mascote nem rolagem horizontal nos cenários inspecionados.

Validação da preparação: 15 testes Laravel (82 asserções), 9 testes Vitest, build Vite e verificação visual do login em viewport móvel passaram. `migrate:status` confirmou as migrations no MySQL local, sem alterar dados. O container Docker e o proxy publicado ainda não foram executados nas plataformas. As CLIs de Vercel e Northflank foram instaladas e autenticadas posteriormente; Docker continua indisponível neste ambiente.

## Problemas encontrados

O primeiro scaffold Vite criou um template JavaScript simples; foi convertido para React/TypeScript. Um teste detectou que a validação inicial descartava os itens de comandos múltiplos; o contrato foi corrigido. O teste de navegador revelou uma conversão incorreta de UTF-8 no frontend; ela foi reparada. O comando opcional `php artisan db:show` requer a extensão PHP `intl`, que existe na instalação local mas não está ativada por padrão; a API e a interface funcionaram sem ela. Para usar esse comando, execute `php -d extension=php_intl.dll artisan db:show --counts`.
