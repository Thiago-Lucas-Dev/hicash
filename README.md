# HiCash

Aplicação local de finanças pessoais com React, Laravel, MySQL e assistente determinístico em JavaScript. O nome definitivo está em aberto.

## Preparação no Windows

1. No MySQL Workbench, crie um banco vazio: `CREATE DATABASE hicash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
2. No diretório `backend`, copie `.env.example` para `.env` e informe `DB_USERNAME` e `DB_PASSWORD`. Mantenha esse arquivo fora do Git.
3. Execute no `backend`: `php C:\ProgramData\ComposerSetup\bin\composer.phar install`, `php artisan key:generate`, `php artisan migrate` e `php artisan db:seed`. Depois execute `php artisan hicash:create-user` em um terminal interativo para criar o login inicial.
4. Execute no `frontend`: `npm install`.
5. Em terminais separados, execute `php artisan serve --host=127.0.0.1 --port=8000` no `backend`, `php artisan schedule:work` no `backend` e `npm run dev` no `frontend`.
6. Abra o endereço indicado pelo Vite, normalmente `http://localhost:5173`. O proxy do Vite encaminha `/api` ao Laravel local.

`php artisan db:seed --class=DemoSeeder` cria dados opcionais de apresentação. Use somente em um banco de demonstração.

## Testes

- No diretório `backend`: `php artisan test`.
- No diretório `frontend`: `npm test` e `npm run build`.
- No diretório `frontend`: `npm run test:e2e` com Laravel e Vite em execução e Chrome instalado. Esse teste apenas lê os dados.
- `npm run test:e2e:write` cobre o fluxo completo e cria contas e lançamentos; execute-o apenas com banco descartável.

Os testes Laravel usam SQLite em memória para isolar os cenários. A aplicação normal usa MySQL. Em `APP_ENV=local`, o Scheduler gera ocorrências vencidas diariamente; `php artisan schedule:work` deve permanecer em execução durante o uso local.

## Referência

Consulte `PROJECT.md`, `ARCHITECTURE.md`, `CHATBOT_SPEC.md`, `DECISIONS.md`, `PROGRESS.md` e `DEPLOYMENT.md`. A API financeira exige login também no ambiente local.
