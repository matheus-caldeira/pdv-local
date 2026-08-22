import { describe, expect, it } from 'vitest';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { encodeReceipt } from './escpos-bytes';

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Ação Escoteira',
  lines: [{ label: 'Refri', qty: 1, value: 'R$ 5,00' }],
  printedAt: 1000,
};

function indexOfSequence(bytes: Uint8Array, sequence: number[]): number {
  return bytes.findIndex((_, start) =>
    sequence.every((byte, offset) => bytes[start + offset] === byte),
  );
}

function asciiOf(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) =>
      byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ' ',
    )
    .join('');
}

describe('encodeReceipt', () => {
  it('seleciona o codepage pedido via ESC t', () => {
    const bytes = encodeReceipt(receipt, 80, 'cp860');

    expect(indexOfSequence(bytes, [0x1b, 0x74, 0x03])).toBeGreaterThanOrEqual(
      0,
    );
  });

  it('codifica a acentuação conforme o codepage escolhido', () => {
    const portuguese = encodeReceipt(receipt, 80, 'cp860');
    const latin1 = encodeReceipt(receipt, 80, 'windows1252');

    expect(indexOfSequence(portuguese, [0x87, 0x84])).toBeGreaterThanOrEqual(0);
    expect(indexOfSequence(latin1, [0xe7, 0xe3])).toBeGreaterThanOrEqual(0);
  });

  it('preserva o texto do cupom nos bytes', () => {
    const text = asciiOf(encodeReceipt(receipt, 80, 'cp860'));

    expect(text).toContain('Comanda');
    expect(text).toContain('1x Refri');
    expect(text).toContain('R$ 5,00');
  });

  it('encerra com o corte do papel', () => {
    const bytes = encodeReceipt(receipt, 80, 'cp860');

    expect(indexOfSequence(bytes, [0x1d, 0x56])).toBeGreaterThanOrEqual(0);
  });

  it('respeita a largura do papel no alinhamento do item', () => {
    const narrow = asciiOf(encodeReceipt(receipt, 58, 'cp860'));
    const wide = asciiOf(encodeReceipt(receipt, 80, 'cp860'));

    expect(narrow).toContain('1x Refri' + ' '.repeat(32 - 8 - 7) + 'R$ 5,00');
    expect(wide).toContain('1x Refri' + ' '.repeat(48 - 8 - 7) + 'R$ 5,00');
  });

  it('codifica um cupom mínimo sem quebrar', () => {
    const minimal: Receipt = {
      title: 'Estoque atual',
      businessName: 'Grupo Escoteiro',
      lines: [{ label: 'Refri' }],
      printedAt: 1000,
    };

    expect(encodeReceipt(minimal, 58, 'cp850').length).toBeGreaterThan(0);
  });
});
