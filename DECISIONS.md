# Decisões técnicas e arquiteturais

| ID | Decisão | Justificativa |
|---|---|---|
| D-001 | React + TypeScript + Vite, Tailwind CSS e shadcn/ui | Tecnologias da especificação aprovada para interface responsiva. |
| D-002 | Motor determinístico em módulos JavaScript independentes do React | Funciona sem API externa e permite testes e futura troca de estratégia. |
| D-003 | Laravel como única autoridade para validação, persistência e cálculos | Mantém formulários e chatbot sob as mesmas regras financeiras. |
| D-004 | MySQL local e API `/api/v1`, sem autenticação inicial | Escopo acadêmico de um usuário, restrito ao ambiente local. |
| D-005 | Saldo efetivo e previsto separados; previsão até o fim do período selecionado | Distingue caixa realizado de compromissos ainda pendentes. |
| D-006 | Cartão de crédito conta como despesa, sem saída bancária imediata | Controle de fatura não integra a primeira versão; limitação deve aparecer na UI. |
| D-007 | Recorrências por formulário, geradas como pendentes, com unicidade por regra/data | Evita lançamentos automáticos pagos e duplicações após interrupções. |
| D-008 | Operações agrupadas atômicas, exclusão lógica, auditoria e idempotência | Protege integridade e permite rastrear alterações. |
| D-009 | Moeda BRL, fuso `America/Sao_Paulo`, credenciais em `.env` | Convenções da primeira instalação local. |
| D-010 | Agregados monetários calculados com `bcmath` no backend | Evita arredondamento de ponto flutuante em saldos; gráficos recebem valores apenas para visualização. |
| D-011 | Comandos de chat serializados pelo bloqueio de `chat_state` | Evita execução simultânea repetida e mantém contexto e confirmações coerentes. |
| D-012 | Categorias iniciais no seeder padrão e dados de apresentação em seeder opcional | Evita misturar dados fictícios com finanças reais. |
| D-013 | Sessão Laravel Sanctum por proxy Vercel, com cookie `HttpOnly` e CSRF | Evita token persistido no navegador e cookies de terceiros entre domínios gratuitos. |
| D-014 | Um único usuário global, sem cadastro público e sem `user_id` financeiro | Protege a arquitetura originalmente pessoal sem reestruturar regras de negócio. |
| D-015 | Railpack/FrankenPHP para a API e MySQL privado no Railway | Usa o runtime oficialmente detectado pela plataforma, sem servidor de desenvolvimento. |
| D-016 | Railway Cron chama `hicash:recurrences` diretamente às 03:10 UTC | O processo termina, tolera atraso e evita a imprecisão de casar `schedule:run` com um único minuto. |
| D-017 | React Router com rotas protegidas por seção | Permite deep links e preserva a tela após recarregar a aplicação. |

Novas decisões relevantes devem ser acrescentadas aqui com a respectiva justificativa. Alterações funcionais também devem atualizar a documentação específica.
