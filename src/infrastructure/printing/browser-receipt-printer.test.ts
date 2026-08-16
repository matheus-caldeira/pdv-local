// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isLeft, isRight } from '../../domain/shared/either';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { BrowserReceiptPrinter } from './browser-receipt-printer';

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

describe('BrowserReceiptPrinter', () => {
  beforeEach(() => {
    vi.stubGlobal('print', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('renderiza o cupom e dispara a impressão', async () => {
    const printer = new BrowserReceiptPrinter(80);

    const result = await printer.print(receipt);

    expect(isRight(result)).toBe(true);
    expect(window.print).toHaveBeenCalled();
  });

  it('remove o cupom do documento depois de imprimir', async () => {
    const printer = new BrowserReceiptPrinter(80);

    await printer.print(receipt);

    expect(document.querySelector('[data-receipt]')).toBeNull();
  });

  it('devolve erro quando a impressão falha', async () => {
    vi.stubGlobal(
      'print',
      vi.fn(() => {
        throw new Error('sem impressora');
      }),
    );
    const printer = new BrowserReceiptPrinter(80);

    const result = await printer.print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINT_FAILED');
  });

  it('renderiza itens sem valor, comanda sem cliente/ticket/rodapé e papel de 58mm', async () => {
    const minimalReceipt: Receipt = {
      title: 'Estoque atual',
      businessName: 'Grupo Escoteiro',
      lines: [{ label: 'Refri' }],
      printedAt: 1000,
    };
    const printer = new BrowserReceiptPrinter(58);

    const result = await printer.print(minimalReceipt);

    expect(isRight(result)).toBe(true);
  });
});
