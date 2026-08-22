import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLeft, isRight } from '../../domain/shared/either';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { RawBtReceiptPrinter } from './rawbt-receipt-printer';

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Ação Escoteira',
  ticket: '042',
  customerName: 'Maju (Lobinha)',
  lines: [{ label: 'Refri', qty: 1, value: 'R$ 5,00' }],
  total: 5,
  footer: 'Pagar no caixa',
  printedAt: 1000,
};

function stubNavigation() {
  const assign = vi.fn();
  vi.stubGlobal('window', {
    location: {
      get href() {
        return '';
      },
      set href(value: string) {
        assign(value);
      },
    },
  });
  return assign;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RawBtReceiptPrinter', () => {
  it('dispara o deep link do RawBT', async () => {
    const assign = stubNavigation();

    const result = await new RawBtReceiptPrinter(80, 'cp860').print(receipt);

    expect(isRight(result)).toBe(true);
    expect(assign).toHaveBeenCalledOnce();
    expect(assign.mock.calls[0][0]).toMatch(/^rawbt:/);
  });

  it('leva o codepage escolhido no payload', async () => {
    const assign = stubNavigation();

    await new RawBtReceiptPrinter(80, 'cp860').print(receipt);
    const payload = decodeURIComponent(
      assign.mock.calls[0][0].slice('rawbt:'.length),
    );

    expect(payload).toContain('\x1b\x74\x03');
  });

  it('troca os bytes de controle conforme o codepage', async () => {
    const assign = stubNavigation();

    await new RawBtReceiptPrinter(80, 'windows1252').print(receipt);
    const payload = decodeURIComponent(
      assign.mock.calls[0][0].slice('rawbt:'.length),
    );

    expect(payload).toContain('\x1b\x74\x10');
  });

  it('preserva quebras de linha e o corte do papel', async () => {
    const assign = stubNavigation();

    await new RawBtReceiptPrinter(58, 'cp860').print(receipt);
    const payload = decodeURIComponent(
      assign.mock.calls[0][0].slice('rawbt:'.length),
    );

    expect(payload).toContain('\x0a');
    expect(payload).toContain('\x1d\x56');
  });

  it('codifica cupons longos sem estourar a pilha', async () => {
    const assign = stubNavigation();

    const big: Receipt = {
      ...receipt,
      lines: Array.from({ length: 5000 }, (_, index) => ({
        label: `Item ${index} com um nome bastante longo`,
        qty: 1,
        value: 'R$ 1,00',
      })),
    };

    const result = await new RawBtReceiptPrinter(80, 'cp860').print(big);

    expect(isRight(result)).toBe(true);
    expect(assign).toHaveBeenCalledOnce();
  });

  it('devolve erro quando a navegação falha', async () => {
    vi.stubGlobal('window', {
      location: {
        set href(_value: string) {
          throw new Error('bloqueado');
        },
      },
    });

    const result = await new RawBtReceiptPrinter(80, 'cp860').print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINT_FAILED');
  });
});
