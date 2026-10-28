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
| D-013 | Sessão Laravel e CSRF em toda a API financeira, sem cadastro público | Protege dados na internet e reutiliza a tabela `users` existente. |
| D-014 | Proxy de servidor na Vercel para `/api/v1` | Mantém cookies de sessão no domínio do frontend com domínios gerados por plataformas diferentes. |
| D-015 | Imagem Docker PHP-FPM/Nginx e MySQL privado no Northflank | Separa produção do servidor de desenvolvimento e mantém persistência no addon. |
| D-016 | Cron Job Northflank com comando Artisan finito, de hora em hora | Executa sem acesso ao frontend e recupera atrasos sem scheduler concorrente. |
| D-017 | Logos, símbolo, paleta e ícones oficiais HiCash no frontend | Centraliza a identidade nos temas claro/escuro e preserva os fluxos financeiros e do chat. O mascote atual não é utilizado; uma nova versão poderá ser aplicada apenas no login em mudança futura. Por escolha de marca, ações com fundo `#22C55E` usam texto branco apesar do contraste de 2,28:1, abaixo da meta WCAG para texto pequeno. |
| D-018 | Refinamento visual com verde primário `#16A34A` e hover `#15803D` | Substitui a paleta de interface de D-017 sem alterar os gráficos oficiais. Para texto branco em ações, usa fundo `#15803D` e hover `#166534` por contraste. Centraliza cores e raios semânticos, reduz arredondamentos e harmoniza sidebar, dashboard, listas, formulários e chat nos dois temas. O uso de um futuro mascote permanece em definição. |
| D-019 | Login split com mascote completo exclusivo | Usa o mascote oficial `/brand/mascot-login.webp` no grupo institucional centralizado e mantém o formulário no painel verde. A composição tem cores fixas nos dois temas; a autenticação Laravel, CSRF e sessão não mudam. Os ícones compactos do chat permanecem independentes. |
| D-020 | Hierarquia visual do login refinada | Mantém o split e usa o card de apresentação como âncora do mascote original. Benefícios compactos ficam abaixo do card; a conversa demonstrativa permanece discreta dentro dele. Iluminação suave nos dois painéis e alinhamento à esquerda no formulário aumentam a hierarquia sem alterar autenticação ou identidade oficial. |
| D-021 | Composição institucional do login reconstruída | A headline passa a ocupar o primeiro nível fora dos cards; o mascote original ganha presença ao lado de uma prévia ilustrativa do assistente e os benefícios viram uma faixa sem superfícies individuais. O formulário branco ganha áreas visuais de cabeçalho e campos, mantendo o split, marca e fluxo Laravel existentes. |
| D-022 | Referência definitiva da tela de login | `docs/design/login-final-reference.png` (1672 × 941) é a única fonte visual aprovada para o login. A interface reproduz sua composição em React/CSS e usa os ativos oficiais. “Lembrar-me” e recuperação de senha não aparecem como controles porque não há suporte funcional; o rodapé descreve apenas sessão autenticada e CSRF. |
| D-023 | Interface autenticada alinhada à referência definitiva do login | O login e os ativos oficiais permanecem intactos. Tokens semânticos claros e escuros, tipografia, superfícies e componentes Radix comuns organizam a sidebar, topbar, páginas e modais. O verde oficial é `#16A34A`; ações com texto branco usam `#15803D` por contraste. Despesas e danger partem de `#DC2626` com papéis visuais distintos. |
| D-024 | Perfil e período personalizados na topbar | Nome e e-mail vêm de `auth/me`; o menu executa a navegação e o logout existentes. O período continua no formato `YYYY-MM`, sem mudar a interpretação de datas. |
| D-025 | Cards de chat baseados em resultado persistido | `presentation` é aditivo ao contrato atual e só é construído após confirmação da operação pelo Laravel. O interpretador JavaScript e as regras financeiras não mudam. Ambos os modos do chat usam o mesmo componente e histórico. |

Novas decisões relevantes devem ser acrescentadas aqui com a respectiva justificativa. Alterações funcionais também devem atualizar a documentação específica.
