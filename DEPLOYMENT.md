# Deploy do HiCash

## Estado do deploy

Em 26/10/2026, o projeto `thiago-086d/hicash` foi criado e vinculado pela CLI na Vercel, mas ainda não recebeu um deployment. A conexão GitHub depende de adicionar o GitHub como Login Connection na conta Vercel e confirmar `frontend` como Root Directory.

O deploy Railway está bloqueado externamente: a criação da conta respondeu `Sign ups are currently disabled. Please try again later.`. Por isso ainda não existem projeto Railway, MySQL, URL da API nem Cron, e `API_ORIGIN` não pode ser configurada. O frontend não deve ser publicado como concluído antes desse backend existir.

## Arquitetura de produção

- **Vercel:** build estático do React/Vite e Function de proxy a partir de `frontend/`.
- **Railway API:** Laravel em `backend/`, construído pelo Railpack e servido por FrankenPHP.
- **Railway MySQL:** banco privado de produção, independente do MySQL local.
- **Railway Cron:** serviço separado que executa `php artisan hicash:recurrences` e termina.

O navegador usa somente `/api` no domínio da Vercel. A Function `api/[...path].ts` encaminha as chamadas ao Railway e traduz `/api/csrf-cookie` para o endpoint Sanctum, mantendo cookies de sessão `HttpOnly` e CSRF no mesmo origin percebido pelo navegador. A URL Railway permanece pública para healthchecks, mas os endpoints financeiros exigem autenticação.

## Vercel

Crie um projeto conectado ao repositório e configure:

| Opção | Valor |
|---|---|
| Production Branch | `main` |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24 |

Se o projeto foi criado pela CLI a partir de `frontend/`, confira novamente o Root Directory ao conectar o repositório GitHub: para deployments por push ele deve ser `frontend` relativo à raiz do repositório.

O `vercel.json` versionado configura o build, o fallback SPA e desabilita cache em `/api`. A Function de proxy lê a origem do backend apenas no servidor. Configure na Vercel, para Production e Preview:

```dotenv
API_ORIGIN=https://<api>.up.railway.app
```

Não inclua barra final. A Function rejeita upstream de produção sem HTTPS e devolve `503` quando a variável não existe.

As variáveis públicas opcionais são:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_CSRF_URL=/api/csrf-cookie
```

Nunca coloque senhas, `APP_KEY`, credenciais MySQL ou tokens em variáveis `VITE_*`.

## Railway API

Crie um serviço ligado ao mesmo repositório com root `/backend`. Deixe o Railpack detectar Laravel; ele instala o PHP exigido pelo Composer, otimiza os caches Laravel durante o build e inicia FrankenPHP. Configure:

- Pre-deploy: `php artisan migrate --force && php artisan db:seed --force`
- Healthcheck: `/api/v1/health`
- Healthcheck timeout: `300`
- Restart policy: `On Failure`
- Domínio público HTTPS gerado pelo Railway

Variáveis da API, sem valores secretos:

```dotenv
APP_NAME=HiCash
APP_ENV=production
APP_KEY=<gerar com php artisan key:generate --show>
APP_DEBUG=false
APP_URL=https://<api>.up.railway.app
APP_LOCALE=pt_BR
APP_FALLBACK_LOCALE=pt_BR

DB_CONNECTION=mysql
DB_URL=${{hicash-mysql.MYSQL_URL}}
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci

CORS_ALLOWED_ORIGINS=https://<frontend>.vercel.app
SANCTUM_STATEFUL_DOMAINS=<frontend>.vercel.app
SESSION_DRIVER=database
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_DOMAIN=null

CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
LOG_CHANNEL=stderr
LOG_STDERR_FORMATTER=\Monolog\Formatter\JsonFormatter
LOG_LEVEL=info
RAILPACK_SKIP_MIGRATIONS=true
```

`RAILPACK_SKIP_MIGRATIONS=true` evita uma segunda execução automática, pois a migration já roda no pre-deploy. O seeder padrão é idempotente e cria somente as categorias; nunca execute `DemoSeeder` em produção.

Após o primeiro deploy, crie a única conta autorizada em uma sessão SSH interativa:

```bash
railway ssh --service hicash-api -- php artisan hicash:user:create
```

Para trocar uma senha sem expô-la no histórico:

```bash
railway ssh --service hicash-api -- php artisan hicash:user:password
```

Não existe cadastro público. A troca de senha encerra as sessões existentes.

## MySQL

Crie o serviço `hicash-mysql` no mesmo projeto Railway e mantenha-o privado. Use `MYSQL_URL` por variável de referência; não habilite TCP público salvo para uma operação temporária e deliberada de backup.

Antes de migrations em um banco com dados, gere e verifique um backup. Nunca use `migrate:fresh`, `db:wipe`, exclusão manual de tabelas ou seeds de demonstração. Valores financeiros permanecem `DECIMAL(15,2)`, texto usa `utf8mb4` e datas financeiras são interpretadas em `America/Sao_Paulo`.

## Recorrências

Crie `hicash-cron` a partir do mesmo repositório e root `/backend`, compartilhando `APP_KEY`, configuração de logs e `DB_URL` com a API. Defina:

| Opção | Valor |
|---|---|
| Start Command | `php artisan hicash:recurrences` |
| Cron Schedule | `10 3 * * *` |
| Restart Policy | `Never` |
| Public Networking | desabilitado |

O Railway agenda em UTC; `03:10 UTC` corresponde atualmente a `00:10` em São Paulo. O comando calcula a data em `America/Sao_Paulo`, recupera ocorrências atrasadas, cria registros pendentes e usa a constraint única `recurrence_rule_id + occurrence_date` para impedir duplicatas. Não execute `schedule:work` simultaneamente no Railway. Para desenvolvimento local, o Scheduler Laravel continua disponível.

## Procedimento de publicação

1. Execute `composer install`, `php artisan test`, `composer audit`, `npm ci`, `npm test` e `npm run build` localmente.
2. Revise migrations e obtenha backup se o banco já contiver dados.
3. Publique a branch `main` no GitHub.
4. Implante MySQL e API; confirme build, migrations, seed, healthcheck e logs.
5. Crie o usuário inicial por SSH.
6. Gere o domínio Railway, configure `API_ORIGIN` na Vercel e publique o frontend.
7. Atualize CORS/Sanctum com o domínio Vercel definitivo e redeploye a API.
8. Implante o Cron e faça uma execução controlada do comando.
9. Valide login, reload de deep link, dashboard, CRUD, chatbot, tema e viewport móvel com dados sintéticos.

Os testes Playwright exigem as credenciais do usuário de teste somente no ambiente do processo; não grave esses valores em arquivo nem no Git:

```powershell
$env:HICASH_E2E_EMAIL='<email>'
$env:HICASH_E2E_PASSWORD='<senha>'
npm run test:e2e
```

O teste de escrita (`npm run test:e2e:write`) cria dados sintéticos e deve ser usado apenas em banco descartável ou com autorização explícita.

## Logs e diagnóstico

- Railway API/Cron: painel de Deployments ou `railway logs --service <serviço>`.
- Vercel: Deployment Logs e Runtime Logs do projeto.
- `401`: sessão ausente/expirada ou endpoint corretamente protegido.
- `419`: verifique `/api/csrf-cookie`, o cookie `XSRF-TOKEN`, HTTPS e o domínio stateful.
- `502/503` em `/api`: confira `API_ORIGIN`, o domínio público e os logs da Function Vercel.
- CORS: confirme `CORS_ALLOWED_ORIGINS` sem barra final e redeploy após alterar variáveis.
- Banco: confirme a referência privada `MYSQL_URL`, migrations e extensões `bcmath`/`pdo_mysql`.
- Healthcheck `503`: a aplicação iniciou, mas o banco não está acessível.

## Atualização e rollback

Atualizações normais são disparadas por push na `main`. Verifique changelogs antes de atualizar PHP, Laravel, Vite ou React e rode a suíte completa. Railway e Vercel permitem restaurar um deployment anterior; isso não desfaz migrations. Em incidentes de schema, preserve o banco, restaure o backup quando necessário e prefira uma migration corretiva para frente.

## Custos

- Vercel Hobby é gratuito apenas para uso pessoal e não comercial, sujeito a limites de uso.
- Railway será usado inicialmente no trial. Railway Cron não permanece disponível no plano Free após o teste; continuidade exige autorização para o plano Hobby, atualmente com mínimo de US$ 5/mês e cobrança de excedentes.
- MySQL, API, Cron, armazenamento, CPU, memória e egress consomem os créditos Railway. Configure alertas e nunca habilite upgrade ou recursos pagos sem autorização.
