# Adicionais e extras

Adicionais são as opções que o cliente escolhe junto com o produto: ponto da
carne, acompanhamentos, tamanho, ingredientes extras. No menu do app, essa tela
aparece como **Extras** (Customizações).

A ideia é a mesma dos apps de delivery: você cria **grupos** de opções e, dentro
de cada grupo, os **itens** que o cliente pode escolher. Depois vincula os grupos
aos produtos em [Produtos](produtos).

## Criar um grupo

1. Toque em **Novo Grupo**.
2. Preencha:
   - **Nome do Grupo**. Ex: "Ponto da carne", "Adicionais", "Tipo do pão".
   - **Obrigatório?** — se "Sim", o cliente é obrigado a escolher na venda; se
     "Não", ele pode pular.
   - **Mínimo** e **Máximo** — quantas opções podem ser escolhidas no grupo.
   - **Cobrar a partir de (seleções)** — quantas escolhas são gratuitas antes de
     começar a cobrar. Ex: `2` significa que as 2 primeiras seleções do grupo são
     grátis e a partir da terceira passa a cobrar. Deixe `0` para sempre cobrar.
3. Toque em **Salvar**.

## Adicionar itens ao grupo

1. Toque no grupo para expandi-lo e depois em **Adicionar Item**.
2. Preencha:
   - **Nome**. Ex: "Bacon extra", "Cheddar", "Bem passado".
   - **Preço** — quanto esse item soma ao pedido. Deixe `0` para um item
     gratuito.
   - **Máximo por item** — quantas unidades do mesmo item o cliente pode escolher.
     `0` usa o limite do grupo.
   - **Cobrar a partir de (unidades)** — quantas unidades desse item são grátis
     antes de cobrar. Ex: `1` = a primeira é grátis, cobra a partir da segunda.
     `0` = sempre cobra.
   - **Status**: Ativo ou Inativo.
3. Toque em **Salvar**.

## Vincular aos produtos

Criar o grupo não basta — ele precisa ser **vinculado** a um produto para
aparecer na venda. Faça isso na tela de [Produtos](produtos), editando o produto
e marcando os grupos que ele aceita.

## Como aparece na venda

Na [Venda rápida](venda), ao tocar num produto com adicionais, abre uma janela
mostrando cada grupo com seus itens. O sistema:

- Respeita o mínimo e máximo de cada grupo.
- Exige escolha nos grupos obrigatórios.
- Calcula o preço dos adicionais, aplicando as regras de "grátis até X".

## Editar e remover

- Toque no **lápis** para editar um grupo ou item.
- Toque na **lixeira** para remover. Ao remover um grupo, seus itens são apagados
  e o grupo é desvinculado automaticamente dos produtos que o usavam.
