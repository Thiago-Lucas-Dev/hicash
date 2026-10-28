# HiCash — Assets exclusivos da tela de login

Este pacote contém o mascote 3D verde com moeda, balão de conversa, braço acenando e antena, **preservado sem redesenho**.

## Instalação

Copie o conteúdo da pasta `frontend/public/brand/` para a pasta pública equivalente do frontend React existente no repositório:

- `frontend/public/brand/mascot-login.png` — arquivo PNG original, RGBA com transparência, 1254×1254 px.
- `frontend/public/brand/mascot-login.webp` — conversão WebP sem perdas do mesmo PNG, destinada ao uso no navegador.

**Não substitua** `mascot-chat.png`, `mascot-chat.svg`, `mascot-chat.webp`, `mark-hicash.png` ou quaisquer logos/favicons existentes. Eles continuam responsáveis pelas versões compactas de chat e marca.

## Uso no frontend

Se a pasta pública é `frontend/public`, use caminhos URL absolutos da raiz do domínio:

```tsx
<img
  src="/brand/mascot-login.webp"
  alt="Mascote HiCash apresentando o assistente financeiro"
  width={360}
  height={360}
  className="h-auto w-full object-contain"
/>
```

Mantenha `object-contain` para não recortar ou distorcer o mascote. A imagem é estática e possui transparência. Caso exista componente ou loader de imagens diferente, adapte a integração sem modificar o arquivo.

## Direção de interface aprovada

- Split login: esquerdo 56% institucional off-white `#F8FAF9`; direito 44% verde `#16A34A`.
- **O conteúdo institucional inteiro** é um grupo centralizado vertical/horizontalmente na área esquerda, incluindo mascote e card; padding externo 48–64 px no desktop, adaptado em telas menores; largura máxima orientativa 600–650px.
- Mascote à esquerda, com uma sobreposição visual suave ao card (cerca de 20–35px), sem alterar sua pose. O grupo precisa permanecer centralizado considerando a largura do mascote, não só a do card.
- Card institucional principal: título, subtítulo, três benefícios pequenos **dentro** do mesmo card; um detalhe discreto de conversa pode ser integrado sem criar outro card grande.
- Formulário de login: card branco centralizado na área verde, com logo oficial HiCash acima dos campos, e-mail, senha, botão e feedbacks existentes. Nada de links/funcionalidades falsas.
- Arredondamentos moderados e consistência com tema/design system atual.
- No celular, priorize o formulário; simplifique o branding, mantendo espaços seguros.

## Integridade

- O PNG é uma cópia binária do arquivo de origem desta conversa; não foi gerado outro personagem.
- O WebP foi convertido sem perdas, mantendo transparência e pixels do PNG.
- Não fornecemos um SVG vetorial do mascote 3D: mudar a extensão não transforma um bitmap em vetor.
