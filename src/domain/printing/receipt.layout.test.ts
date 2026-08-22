import { describe, expect, it } from 'vitest';
import type { Receipt } from './receipt.entity';
import { buildReceiptLayout } from './receipt.layout';

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Grupo Escoteiro',
  ticket: '042',
  customerName: 'Maju (Lobinha)',
  lines: [{ label: 'Refri', qty: 1, value: 'R$ 5,00' }],
  total: 5,
  footer: 'Pagar no caixa',
  printedAt: 1000,
};

function textOf(receiptToBuild: Receipt, width: 58 | 80 = 80): string[] {
  return buildReceiptLayout(receiptToBuild, width).map((line) => line.text);
}

describe('buildReceiptLayout', () => {
  it('abre com o nome do negócio e o título centralizados', () => {
    const layout = buildReceiptLayout(receipt, 80);

    expect(layout[0]).toEqual({
      text: 'Grupo Escoteiro',
      align: 'center',
      bold: true,
    });
    expect(layout[1]).toEqual({
      text: 'Comanda',
      align: 'center',
      bold: false,
    });
  });

  it('inclui comanda e cliente quando presentes', () => {
    expect(textOf(receipt)).toContain('042');
    expect(textOf(receipt)).toContain('Maju (Lobinha)');
  });

  it('omite comanda, cliente, total e rodapé quando ausentes', () => {
    const minimal: Receipt = {
      title: 'Estoque atual',
      businessName: 'Grupo Escoteiro',
      lines: [{ label: 'Refri' }],
      printedAt: 1000,
    };

    const lines = textOf(minimal);

    expect(lines).toEqual(['Grupo Escoteiro', 'Estoque atual', 'Refri']);
  });

  it('prefixa a quantidade no item quando informada', () => {
    const lines = textOf(receipt);

    expect(lines.some((line) => line.startsWith('1x Refri'))).toBe(true);
  });

  it('alinha o valor na margem direita conforme a largura do papel', () => {
    const wide = textOf(receipt, 80).find((line) => line.includes('Refri'));
    const narrow = textOf(receipt, 58).find((line) => line.includes('Refri'));

    expect(wide).toHaveLength(48);
    expect(narrow).toHaveLength(32);
    expect(wide?.endsWith('R$ 5,00')).toBe(true);
    expect(narrow?.endsWith('R$ 5,00')).toBe(true);
  });

  it('mantém ao menos um espaço entre rótulo e valor quando não cabe', () => {
    const long: Receipt = {
      ...receipt,
      lines: [{ label: 'x'.repeat(60), value: 'R$ 5,00' }],
    };

    const line = textOf(long, 58).find((text) => text.includes('xxx'));

    expect(line).toBe('x'.repeat(60) + ' ' + 'R$ 5,00');
  });

  it('escreve o item sem preenchimento quando não há valor', () => {
    const noValue: Receipt = { ...receipt, lines: [{ label: 'Refri' }] };

    expect(textOf(noValue)).toContain('Refri');
  });

  it('emite o total em negrito, alinhado à direita', () => {
    const totalLine = buildReceiptLayout(receipt, 80).find((line) =>
      line.text.startsWith('Total'),
    );

    expect(totalLine).toEqual({
      text:
        'Total' +
        ' '.repeat(48 - 'Total'.length - 'R$ 5,00'.length) +
        'R$ 5,00',
      align: 'left',
      bold: true,
    });
  });

  it('inclui o total zerado, que é informação legítima', () => {
    const zero: Receipt = { ...receipt, total: 0 };

    expect(textOf(zero).some((line) => line.includes('R$ 0,00'))).toBe(true);
  });

  it('fecha com o rodapé centralizado', () => {
    const layout = buildReceiptLayout(receipt, 80);

    expect(layout[layout.length - 1]).toEqual({
      text: 'Pagar no caixa',
      align: 'center',
      bold: false,
    });
  });
});
