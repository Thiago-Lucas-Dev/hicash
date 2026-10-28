# Arquitetura

## Organização

- `frontend/`: React, TypeScript, Vite, telas, componentes, cliente HTTP e módulos JavaScript do interpretador.
- `backend/`: Laravel, rotas `/api/v1`, validações, serviços financeiros, modelos, migrations, scheduler e testes.
- Raiz: documentação de referência e instruções de execução.

O interpretador transforma mensagens em comandos estruturados. Ele não grava dados diretamente. A API valida permissões locais, entidades, valores e regras de negócio, executa em transações de banco e devolve resultados para a resposta do chat. Formulários e chat usam os mesmos serviços de domínio.

O dashboard recebe totais decimais calculados pelo backend, inclusive o agregado de saldos por conta. A série de evolução inclui o mês selecionado e os cinco anteriores. A interface usa números apenas para desenho de gráficos e percentuais visuais.

## Dados e regras

Tabelas centrais: `accounts`, `transactions`, `transfers`, `categories`, `category_aliases`, `category_budgets`, `recurrence_rules`, `chat_messages`, `chat_state`, `settings`, `audit_logs` e `processed_commands`. Registros financeiros usam exclusão lógica. Valores monetários são decimais de duas casas; cálculos não usam ponto flutuante binário.

Saldo efetivo por conta = saldo inicial + receitas concluídas de caixa − despesas concluídas de caixa + transferências recebidas − enviadas. Saldo previsto adiciona receitas pendentes de caixa e subtrai despesas pendentes de caixa até o fim do período selecionado. Despesas no cartão de crédito contam para despesas e orçamentos, mas não alteram esses saldos. Transferências não entram em receitas/despesas.

Orçamento mensal apresenta gasto utilizado (despesas concluídas) e comprometido (pendentes) por categoria; o limiar de alerta é configurável e ultrapassagens não bloqueiam lançamentos. Relatórios e dashboard reutilizam os mesmos cálculos.

## Contratos de integração

### Apresentação da interface autenticada

O frontend mantém a navegação autenticada por estado em `App.tsx`. Os controles comuns (`AppSelect`, modais e confirmações), perfil e período ficam em componentes compartilhados. O seletor de período continua emitindo `YYYY-MM`, preservando os filtros e cálculos atuais. O chat lateral e a página completa renderizam o mesmo histórico e os mesmos componentes de mensagem e resultado.

O resultado de comandos do chat mantém `reply`, `cards` e `options`. Operações confirmadas podem acrescentar `presentation`, um metadado aditivo de interface. `transactions_created` contém `items` lidos do banco após a inserção; `transaction_updated`, `transaction_status_updated` e `transaction_deleted` contêm `item`; `budget_updated` contém o limite confirmado. Cada item de movimentação inclui identificador, tipo, descrição, valor, data, status, pagamento e nomes reais de conta e categoria. O backend persiste esse resultado no histórico e na resposta idempotente. Respostas antigas sem `presentation` continuam legíveis como texto ou pelos `cards` existentes.

API JSON versionada em `/api/v1` para contas, movimentações, transferências, categorias e associações, orçamentos, recorrências, relatórios, mensagens/operações de chat e configurações. Erros de validação retornam campos e mensagens; comandos de chat retornam resultado estruturado, esclarecimento necessário ou confirmação pendente. Um identificador por comando impede repetição. Operações agrupadas validam todas as entradas antes de gravar qualquer uma.

`POST /api/v1/chat/commands` recebe `{command_id, message, interpretation}`. A linha única de `chat_state` é bloqueada durante a operação; o identificador é consultado sob esse bloqueio e a resposta é guardada em `processed_commands`. O estado guarda a confirmação ou escolha pendente e as 12 últimas interações resumidas. O histórico integral permanece em `chat_messages`.

Datas de referência são datas civis no fuso `America/Sao_Paulo`. O servidor é a fonte de verdade para saldos e relatórios. As rotas financeiras e de chat exigem sessão Laravel autenticada, com CSRF e sem cadastro público. Credenciais ficam fora do repositório.

Na hospedagem, o React/Vite da Vercel encaminha `/api/v1` por uma função de servidor ao Laravel no Northflank. O cookie de sessão permanece no domínio do frontend. O MySQL privado do Northflank guarda finanças, sessão e cache. Consulte `DEPLOYMENT.md` para detalhes operacionais.

## Recorrências e IA futura

Regras de recorrência são criadas por formulário. O scheduler gera ocorrências devidas, sempre pendentes, com chave única por regra e data, inclusive após interrupção. Uma ocorrência pode ser editada isoladamente; mudanças em todas as futuras alteram a regra a partir da data escolhida.

Um adaptador opcional de IA poderá propor intenções. Suas propostas passam pelas mesmas validações e execução Laravel; a ausência da API externa não impede o uso do assistente determinístico.

Na hospedagem, um Cron Job Northflank executa diretamente um comando Artisan finito de recorrências a cada hora. O Scheduler continua disponível apenas no ambiente local.
