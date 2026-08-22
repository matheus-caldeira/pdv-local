import { describe, expect, it, vi } from 'vitest';
import { isLeft, isRight, right } from '../../domain/shared/either';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { TriggeredReceiptPrinter } from './triggered-receipt-printer';

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Grupo Escoteiro',
  lines: [{ label: 'Refri' }],
  printedAt: 1000,
};

describe('TriggeredReceiptPrinter', () => {
  it('delega ao gatilho recebido', async () => {
    const trigger = vi.fn().mockResolvedValue(right(undefined));

    const result = await new TriggeredReceiptPrinter(trigger).print(receipt);

    expect(isRight(result)).toBe(true);
    expect(trigger).toHaveBeenCalledWith(receipt);
  });

  it('reporta impressora indisponível sem gatilho', async () => {
    const result = await new TriggeredReceiptPrinter(null).print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINTER_UNAVAILABLE');
  });

  it('converte exceção do gatilho em erro de impressão', async () => {
    const trigger = vi.fn().mockRejectedValue(new Error('falhou'));

    const result = await new TriggeredReceiptPrinter(trigger).print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINT_FAILED');
  });
});
