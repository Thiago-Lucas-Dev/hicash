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

API JSON versionada em `/api/v1` para contas, movimentações, transferências, categorias e associações, orçamentos, recorrências, relatórios, mensagens/operações de chat e configurações. Erros de validação retornam campos e mensagens; comandos de chat retornam resultado estruturado, esclarecimento necessário ou confirmação pendente. Um identificador por comando impede repetição. Operações agrupadas validam todas as entradas antes de gravar qualquer uma.

`POST /api/v1/chat/commands` recebe `{command_id, message, interpretation}`. A linha única de `chat_state` é bloqueada durante a operação; o identificador é consultado sob esse bloqueio e a resposta é guardada em `processed_commands`. O estado guarda a confirmação ou escolha pendente e as 12 últimas interações resumidas. O histórico integral permanece em `chat_messages`.

Datas de referência são datas civis no fuso `America/Sao_Paulo`. O servidor é a fonte de verdade para saldos e relatórios. A API fica restrita ao ambiente local nesta versão, sem autenticação. Credenciais ficam em `.env`, fora do repositório.

## Recorrências e IA futura

Regras de recorrência são criadas por formulário. O scheduler gera ocorrências devidas, sempre pendentes, com chave única por regra e data, inclusive após interrupção. Uma ocorrência pode ser editada isoladamente; mudanças em todas as futuras alteram a regra a partir da data escolhida.

Um adaptador opcional de IA poderá propor intenções. Suas propostas passam pelas mesmas validações e execução Laravel; a ausência da API externa não impede o uso do assistente determinístico.
