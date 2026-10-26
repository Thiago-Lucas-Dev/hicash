# HiCash — Pacote oficial de identidade visual

Este pacote reutiliza a **logo aprovada nesta conversa**, seu símbolo e o mascote mais recente do chat. Os favicons e ícones são derivados do símbolo original, evitando redesenhar a marca.

## Onde colocar

Se a estrutura real usar `frontend/` (React/Vite), copie/mescle o conteúdo de `frontend/` deste ZIP para a pasta `frontend/` do seu repositório.
Copie o arquivo `docs/BRAND_GUIDELINES.md` para `docs/` do repositório. **Não substitua diretórios inteiros nem arquivos de configuração existentes:** faça merge dos arquivos e peça ao Codex para adaptar paths à estrutura real.

## Principais arquivos

- `frontend/public/brand/logo-hicash-light.png` — logo horizontal para fundos claros (texto escuro).
- `frontend/public/brand/logo-hicash-dark.png` — logo horizontal para fundos escuros (texto branco).
- `frontend/public/brand/mark-hicash.png` — símbolo isolado original.
- `frontend/public/brand/mascot-chat.webp` — mascote 3D otimizado para o chatbot.
- `frontend/public/brand/mascot-chat.png` — versão PNG do mesmo mascote.
- `frontend/public/favicon.ico` — favicon multi-tamanho.
- `frontend/public/favicon-16x16.png`, `favicon-32x32.png` — favicons PNG.
- `frontend/public/apple-touch-icon.png` — ícone iOS.
- `frontend/public/icon-192.png`, `icon-512.png` — ícones de aplicativo/PWA.
- `frontend/public/site.webmanifest` — manifest opcional, somente se não existir PWA/manifest já configurado.
- `frontend/src/styles/hicash-brand-tokens.css` — paleta base para integração; não presume tema atual.
- `docs/BRAND_GUIDELINES.md` — uso e guidelines.

## Exemplo de uso no React

```tsx
<img src="/brand/logo-hicash-light.webp" alt="HiCash" />
<img src="/brand/mascot-chat.webp" alt="Assistente HiCash" />
```

Use o componente de tema existente para alternar entre a logo `light` e `dark`.

## Observação de produção

Estes ativos são PNG/WebP derivados das imagens finais já aprovadas, **não são vetores SVG**. Para SVG verdadeiramente editável será necessário redesenho vetorial posterior.
