# Financeiro

A área **Financeiro** ajuda a organizar as contas da família e do negócio:
registrar entradas e saídas, planejar um orçamento, acompanhar contas a pagar e
projetar como o saldo fica nos próximos meses. Tudo salvo no próprio aparelho,
como o resto do PDV Local (lembre-se do [Backup](backup)).

## Conceitos básicos

- **Categorias** organizam o dinheiro por assunto (ex: Mercado, Aluguel,
  Salário). Cada categoria é de **entrada** ou de **saída**.
- **Membros da família** funcionam como etiquetas: cada lançamento pode ser
  marcado com uma ou mais pessoas. Isso não divide o valor — serve para filtrar
  e ver o envolvimento de cada um.
- **Pago ou pendente:** todo lançamento tem um status. **Pendente** é uma conta
  que ainda vai ser paga (ou recebida); **pago** é o que já aconteceu.
- **Atrasadas:** contas pendentes de meses que já passaram. Elas aparecem em
  destaque no painel, num cartão próprio, até serem marcadas como pagas.

Categorias e membros são cadastrados na aba **Configurações** do Financeiro.

## Lançamentos

A aba **Lançamentos** lista as entradas e saídas do mês escolhido no seletor de
mês, no topo.

- **Criar:** toque em novo lançamento e informe descrição, valor, categoria,
  membros, data e se já está pago ou ainda pendente.
- **Filtrar:** dá para filtrar por status, tipo (entrada/saída), categoria,
  membro ou buscar pela descrição. O atalho **Atrasadas** mostra as contas
  vencidas de qualquer mês, independente do mês selecionado.
- **Pagar:** cada lançamento pendente tem uma ação rápida para marcar como pago
  (e desfazer, se marcou sem querer).

## Orçamento

Na aba **Orçamento**, você define quanto pretende gastar (ou receber) por
categoria em cada mês.

- O **modelo** é o valor padrão, que vale para todos os meses (ex: Mercado
  R$ 800 por mês).
- O **ajuste do mês** sobrescreve o modelo só naquele mês (ex: em dezembro,
  Mercado sobe para R$ 1.200). Nos outros meses, continua valendo o modelo.

A tabela compara o **orçado** com o **real** (o que de fato foi lançado no mês)
e mostra a diferença — assim você vê onde estourou e onde sobrou. As barras de
progresso no painel usam essa mesma comparação.

## Recorrências

Contas que se repetem todo mês (aluguel, internet, mensalidades) viram
**recorrências**, na aba **Automações**. Você cadastra uma vez, com valor, dia
do mês e, se quiser, um **mês de término** (bolsas e financiamentos que acabam).

A recorrência **não lança sozinha**: a cada mês, toque em **Lançar mês atual**
(uma a uma ou todas de uma vez) e ela vira um lançamento pendente, pronto para
ser pago. Se já foi lançada no mês, ou o mês está fora do período dela, nada é
duplicado.

## Compras parceladas

Comprou em várias vezes? Cadastre a compra parcelada em **Automações** com o
valor total, o número de parcelas e o mês da primeira. O sistema divide o valor
e cria **um lançamento pendente para cada parcela**, já nos meses certos, com a
numeração (1/10, 2/10...). Antes de confirmar, você vê a prévia das parcelas.

## Fórmulas

Fórmulas calculam um valor como **percentual sobre lançamentos filtrados** —
útil para impostos. Por exemplo: **DARF = 15,5% das entradas da categoria
"Serviços PJ"**.

Ao tocar em **Gerar**, abre uma prévia mostrando quais lançamentos do mês
entraram no cálculo e o total. Você confere, ajusta o filtro se precisar e
escolhe em que mês a conta deve cair. Só depois de confirmar é que o lançamento
é criado (pendente, como uma conta a pagar).

> A prévia avisa se você já gerou essa fórmula para o mesmo mês antes, para não
> lançar o imposto duas vezes sem querer.

## Projeção

A aba **Projeção** estima o **saldo dos próximos meses** (3, 6 ou 12), partindo
do que já foi pago até hoje. Você escolhe a fonte da estimativa:

- **Lançamentos:** considera as contas pendentes já registradas.
- **Orçamento:** considera os valores planejados por categoria.
- **Ambos:** combina os dois, usando o maior valor de cada categoria.

Contas atrasadas entram na projeção do primeiro mês (elas ainda vão ser pagas).
Recorrências ativas que **ainda não foram lançadas** também entram, como valores
**projetados** — a legenda indica quando isso acontece.

## Fechamento do mês

Quando o mês termina, feche-o na aba **Fechamentos**. O fechamento **congela o
resumo** do mês (orçado vs real, por categoria, e os saldos) e **trava o mês**:
não dá mais para criar, editar ou excluir lançamentos nem mudar o orçamento
daquele mês.

> Mesmo com o mês fechado, você ainda pode **marcar contas como pagas** — uma
> conta atrasada de um mês fechado não fica presa.

Antes de confirmar, o sistema avisa se ainda há contas pendentes no mês. E se
precisar corrigir algo, use **Reabrir**: o resumo congelado é descartado e o mês
volta a aceitar alterações (você pode fechá-lo de novo depois).
