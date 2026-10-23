# Especificação do assistente JavaScript

## Responsabilidade e módulos

O motor é independente do React e funciona por normalização e regras determinísticas. Módulos: `normalizer.js`, `intent-classifier.js`, `entity-extractor.js`, `date-parser.js`, `category-resolver.js`, `context-manager.js`, `ambiguity-resolver.js`, `command-handler.js` e `response-builder.js`. O motor interpreta; Laravel valida e executa.

## Intenções da primeira versão

- Registrar despesa (`50 lanche`, `gastei 50`), receita (`recebi 2500 de salário`) ou múltiplos gastos (`50 lanche e 30 gasolina`).
- Consultar despesas, saldos, comparar períodos e analisar oportunidades de economia.
- Editar, excluir com confirmação, desfazer a última movimentação individual elegível e atualizar status.
- Criar categoria e definir orçamento.
- Manter contexto para continuação, como `e no mês passado?`.

O status é concluído em `gastei`, `recebi` e comandos curtos; `tenho que pagar` indica pendente. Datas relativas usam `America/Sao_Paulo`. A primeira versão aceita números, não valores por extenso. Respostas são curtas, objetivas e podem incluir cartões financeiros e atalhos. Temas fora de finanças recebem mensagem de especialização.

## Ambiguidades e segurança operacional

- Sem descrição, pedir complemento antes de registrar. Categoria desconhecida vira `Outros`.
- Referência a vários lançamentos apresenta opções. Exclusão sempre exige confirmação.
- Erros leves de digitação são aceitos apenas quando a intenção permanece segura; caso contrário, pedir esclarecimento.
- Em comando múltiplo, validar todos os itens antes da gravação atômica. Data final ambígua exige data de cada item.
- Desfazer reverte somente a última movimentação individual elegível.
- Associações de categoria são aprendidas apenas após confirmação ou correção e podem ser visualizadas e excluídas.
- O comando explícito `associa feira a Alimentação` confirma uma associação. A lista e a exclusão ficam em Configurações.

Todas as mensagens ficam persistidas. O contexto ativo contém somente interações recentes; lançamentos antigos são buscados no banco. Página e painel flutuante compartilham o mesmo histórico e estado pendente. O backend mantém o controle de idempotência e auditoria. Um futuro provedor de IA poderá sugerir interpretação, sem executar operações.

Quando falta apenas a descrição de um novo lançamento, o assistente guarda o rascunho e interpreta a resposta seguinte como complemento. Para datas de um comando múltiplo, pede que o usuário reformule as datas de cada item.
