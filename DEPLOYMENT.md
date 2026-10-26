# Deploy do HiCash

## Arquitetura e custos

- `frontend/` é React/Vite na Vercel. Uma função Vercel encaminha `/api/v1/*` ao Laravel por HTTPS. `API_ORIGIN` é variável somente do servidor; nenhum segredo entra no bundle React.
- `backend/` é uma imagem Docker com PHP 8.5, Nginx e PHP-FPM, exposta na porta HTTP `8080` no Northflank. O addon MySQL privado guarda os dados, sessões e cache. O aplicativo atual não faz upload de arquivos.
- Um job manual aplica migrations. Um Cron Job separado executa `php artisan hicash:generate-recurrences` no minuto 5 de cada hora. O fuso financeiro é `America/Sao_Paulo`; o comando termina após cada execução.

O [Sandbox gratuito da Northflank](https://northflank.com/docs/v1/application/billing/pricing-on-northflank) comporta dois serviços, dois jobs e um addon, mas a plataforma informa que ele **não deve ser usado em produção**. O plano pago tem custo variável de computação, armazenamento e tráfego. Não ative plano pago sem autorização do proprietário. A [Vercel Hobby](https://vercel.com/docs/plans/hobby) é gratuita para uso pessoal não comercial, com limites de funções, builds e tráfego. Domínio próprio e backups avançados também podem gerar custos. Confirme preços atuais antes de contratar.

## Configuração Northflank

1. Conecte o GitHub e crie um projeto. Crie um addon **MySQL** privado, persistente e com TLS. Não exponha a porta do banco à internet. Defina uma política de backup antes de armazenar finanças reais.
2. Crie um secret group com as credenciais do addon mapeadas para `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD`. Compartilhe-o com serviço e jobs. Use o usuário comum, não o administrador. Se o addon exigir CA de TLS, disponibilize o certificado no container e configure `MYSQL_ATTR_SSL_CA`.
3. Crie um **build service** do repositório com contexto `backend` e Dockerfile `Dockerfile`. Crie um **deployment service** com a imagem desse build, uma instância, porta pública HTTP `8080` e healthcheck HTTP `/ready`. `/up` verifica Laravel; `/ready` também consulta MySQL.
4. Configure as variáveis abaixo. O entrypoint executa `php artisan config:cache` após receber os segredos. Ele não aplica migrations no startup.
5. Crie um job **manual** com a mesma imagem e segredos. Em banco vazio, execute `php artisan migrate --force` e confira `php artisan migrate:status`. Execute `php artisan db:seed --class=DatabaseSeeder --force` **somente** na instalação inicial vazia, para categorias padrão. Nunca execute `migrate:fresh`, `db:wipe` ou `DemoSeeder` em produção.
6. No terminal interativo do serviço, execute `php artisan hicash:create-user`. Informe nome, e-mail e senha forte no prompt oculto. O comando recusa uma segunda criação. Não informe senha em argumentos, variáveis de build, logs ou Git.
7. Crie um **Cron Job** com a mesma imagem e segredos, comando `php artisan hicash:generate-recurrences`, expressão `5 * * * *`, concorrência **Forbid**, execução automática na troca de imagem **Never** e limite de tempo adequado. Rode-o manualmente uma vez e confira o log. Não execute `schedule:work` nem `schedule:run` em paralelo. A unicidade `(recurrence_rule_id, occurrence_date)` protege contra duplicatas e o serviço recupera ocorrências atrasadas.

Consulte os guias oficiais de [MySQL](https://northflank.com/docs/v1/application/databases-and-persistence/deploy-databases-on-northflank), [secret groups](https://northflank.com/docs/v1/application/databases-and-persistence/connect-database-secrets-to-workloads) e [jobs](https://northflank.com/docs/v1/application/run/run-an-image-once-or-on-a-schedule). Com dados existentes em futuras versões, confira migrations pendentes, avalie seus impactos e tire e teste um backup antes de aplicar alterações.

### Variáveis Northflank

| Nome | Valor esperado |
| --- | --- |
| `APP_NAME`, `APP_ENV`, `APP_DEBUG`, `APP_URL` | `HiCash`, `production`, `false`, URL HTTPS pública do serviço |
| `APP_LOCALE`, `APP_FALLBACK_LOCALE` | `pt_BR`, `pt_BR` |
| `APP_KEY` | Chave estável gerada por `php artisan key:generate --show`; guardar como segredo e nunca regenerar em deploy comum |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | `mysql` e segredos do addon |
| `DB_CHARSET`, `DB_COLLATION` | `utf8mb4`, `utf8mb4_unicode_ci` |
| `SESSION_DRIVER`, `SESSION_COOKIE`, `SESSION_SECURE_COOKIE`, `SESSION_HTTP_ONLY`, `SESSION_SAME_SITE`, `SESSION_ENCRYPT` | `database`, `hicash-session`, `true`, `true`, `lax`, `true` |
| `SESSION_DOMAIN` | Deixar ausente: o proxy cria cookie restrito ao host do frontend |
| `CACHE_STORE`, `QUEUE_CONNECTION`, `FILESYSTEM_DISK` | `database`, `sync`, `local` |
| `LOG_CHANNEL`, `LOG_LEVEL` | `stderr`, `warning` |
| `CORS_ALLOWED_ORIGINS` | URL HTTPS exata do frontend Vercel, sem barra final |
| `MYSQL_ATTR_SSL_CA` | Caminho do certificado do addon, se necessário |

Use o **mesmo `APP_KEY`** no serviço e nos jobs. Laravel já define `America/Sao_Paulo`; confirme `utf8mb4` no addon. Não copie o `.env` local para o container.

## Configuração Vercel

Conecte o mesmo repositório; configure raiz `frontend`, framework Vite, instalação `npm ci`, build `npm run build` e saída `dist`. Configure `API_ORIGIN` como variável **de servidor** com a URL HTTPS do Laravel, sem barra final. Não use `VITE_` para credenciais. O `vercel.json` encaminha `/api/v1/*` à função e oferece fallback SPA; arquivos estáticos continuam servidos normalmente. Publique depois de proteger a API. Consulte [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite) e [funções Vercel](https://vercel.com/docs/functions).

O navegador guarda somente o cookie de sessão `HttpOnly`. O frontend busca um token CSRF e o envia nas alterações. O proxy remove `Domain` dos cookies Laravel para restringi-los ao host Vercel. Após mudança de domínio ou variável, publique nova versão e teste login, logout, recarga e expiração da sessão.

## Validação, atualização e rollback

- Antes do deploy: `php artisan test` em `backend/`; `npm test` e `npm run build` em `frontend/`. Testes Laravel usam SQLite em memória. Não rode E2E de escrita em banco real.
- Após o deploy: confira `/up`, `/ready`, `401` anônimo de `/api/v1/dashboard` e `/api/v1/chat/messages`, login, dashboard, contas, categorias, lançamento fictício, saldo, chat nas duas interfaces, histórico, temas e celular. Escreva apenas dados fictícios no banco novo.
- Consulte logs do serviço e de cada Cron Job no Northflank, além dos logs da função e do deploy Vercel. `502` no proxy sugere API indisponível; `503` indica `API_ORIGIN` ausente; `419` indica sessão ou CSRF expirado; `/ready` com `503` indica falha de banco. Não registre senhas, cookies, tokens ou dados financeiros nos logs.
- Para atualizar: publique nova imagem, revise migrations, tire backup quando houver dados, execute o job de migration uma vez, promova a API, atualize cron para a mesma imagem e publique frontend. Verifique login e recorrências.
- Para rollback: volte à imagem anterior no serviço e job e promova o deploy anterior da Vercel. Preserve o banco. Restaurar backup é operação separada que exige avaliar perda de dados e compatibilidade. Nunca rode `migrate:rollback` automaticamente em produção.

**Status em 26/10/2026:** login na Vercel e no Northflank confirmado. O projeto Vercel [`thiago-086d/hicash`](https://vercel.com/thiago-086d/hicash) foi criado na conta Hobby, ligado à pasta local `frontend/` e configurado com Vite, `npm ci`, `npm run build` e saída `dist`. Ainda não há deploy ou URL pública. No Northflank, a equipe autenticada não tem projetos nem repositórios conectados e o saldo de créditos disponível é zero. A criação dos serviços de produção requer decisão explícita sobre os custos; o Sandbox gratuito não é indicado pela plataforma para produção. Depois de publicar a API, configure `API_ORIGIN` na Vercel e publique o frontend. Não considere o deploy concluído antes dos testes nas URLs públicas.
