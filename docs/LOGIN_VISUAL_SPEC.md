# HiCash — Especificação visual do login

Este documento complementa o `README.md` do kit. A identidade visual oficial e os arquivos de logo existentes no projeto continuam sendo a fonte da verdade.

Objetivo: tela de login split organizada e espaçosa; painel institucional off-white com grupo central formado por mascote e card; painel direito verde com formulário branco elegante; sem alterar autenticação ou comportamento financeiro.

**Regra de centralização:** identificação, headline, subtítulo, prévia com mascote e faixa de benefícios formam um único grupo de até 640px, centralizado no painel institucional com padding externo seguro.

**Uso do mascote:** `/brand/mascot-login.webp` no login; PNG como fallback opcional. Os ícones compactos já aprovados do chat devem permanecer inalterados.

## Implementação

- O login usa dois painéis de 56%/44% a partir de 768px. O painel institucional tem fundo `#F8FAF9`; o painel de autenticação usa `#16A34A`.
- A identificação, headline e descrição ficam fora do card, com título de 42–48px no desktop. O subtítulo aprovado é “Organize seus gastos e acompanhe suas finanças com a ajuda do HiCash.”
- O mascote original, com cerca de 270px no desktop, fica à esquerda de uma prévia estática do assistente. A sobreposição é de 40px no desktop e diminui conforme a largura; rosto, moeda, braço e antena permanecem visíveis.
- A prévia mostra “Assistente financeiro”, uma conversa de exemplo e uma movimentação de R$ 50,00 em Alimentação com status Concluído. A indicação “Exemplo de registro” distingue a demonstração de dados reais.
- Os benefícios são uma faixa sem cards individuais: Controle financeiro, Análise de gastos e Assistente inteligente. No tablet estreito, a faixa vira uma lista compacta.
- O painel institucional mantém a base `#F8FAF9` com iluminação radial menta suave. O painel verde usa `#16A34A` predominante e um escurecimento gradual até `#15803D`.
- O mascote completo mantém sua imagem original, proporção e `object-contain`. Seu uso é exclusivo desta tela; os ativos compactos do chat não são alterados.
- O formulário separa uma área superior levemente menta, com logo oficial, título e descrição, da área branca dos campos e botão. Mantém E-mail, Senha, controle de visibilidade, erro e carregamento. A requisição, CSRF e sessão permanecem no fluxo Laravel existente.
- Abaixo de 768px, o painel institucional é ocultado e o formulário fica centralizado no painel verde. As cores da página são fixas para preservar o contraste independentemente do tema global.
