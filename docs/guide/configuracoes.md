# Configurações

A tela **Config** (Configurações) reúne os ajustes do seu negócio, a numeração
das comandas, o controle de status dos pedidos, a exportação/importação de dados
e a impressora.

## Dados do Negócio

Preencha **nome do estabelecimento**, **CNPJ/CPF**, **telefone** e **endereço**.
Esses dados identificam o seu negócio (e aparecerão em recibos e comandas).
Toque em **Salvar**.

## Comandas

A comanda é o número sequencial gerado a cada venda, com zeros à esquerda.

- **Reset Automático** — se "Sim", a sequência reinicia ao passar do limite; se
  "Não", continua sempre crescendo.
- **Limite** — define quantos dígitos a comanda terá. Ex: limite `9999` gera
  comandas de 4 dígitos (0001, 0002, …).
- A tela mostra qual será a **próxima comanda**.
- **Reiniciar Sequência** — informe um número e a próxima comanda passa a ser
  esse valor. Pedidos já registrados não são afetados.

## Pedidos (Controle de Status)

O **Controle de Status** liga o acompanhamento de cada pedido por etapas
(aceito, em preparo, a caminho, finalizado) e **habilita as telas de
[KDS](kds) e [Painel](painel)**.

- **Desligado** (padrão): as telas de cozinha e painel ficam ocultas e os pedidos
  não mostram etapa.
- **Ligado**: aparecem a KDS e o Painel no menu, e cada pedido ganha sua etapa.

Ligue esta opção se você precisa acompanhar o preparo dos pedidos.

## Exportar e Importar Dados

- **Exportar Tudo (JSON)** — baixa um arquivo com todos os seus dados. É o
  recomendado para backup completo.
- **Exportar Tudo (CSV)** — baixa planilhas separadas por tipo (produtos,
  pedidos, etc.), úteis para abrir no Excel.
- **Exportar Individual** — baixa só um tipo de dado.
- **Importar** — escolha o tipo de dado e o arquivo (JSON ou CSV) e toque em
  **Importar**.

O passo a passo completo de backup está em [Backup dos dados](backup).

## Impressora (ESC/POS)

Esta seção é para conectar uma impressora térmica (USB, Bluetooth ou rede) e
imprimir recibos e comandas.

> A impressão ainda está **em preparação**. Os botões de testar e salvar
> impressão são demonstrativos por enquanto. Acompanhe as próximas versões.

## Zona de Perigo

O botão **Apagar Todos os Dados** remove tudo do aparelho e não pode ser
desfeito. Antes de usar, faça um [backup](backup). O sistema pede duas
confirmações por segurança.
