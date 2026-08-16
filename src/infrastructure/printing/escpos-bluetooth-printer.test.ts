import { describe, expect, it, vi, afterEach } from 'vitest';
import { isLeft, isRight } from '../../domain/shared/either';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { EscPosBluetoothPrinter } from './escpos-bluetooth-printer';

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

function makeBluetooth(writeValue = vi.fn().mockResolvedValue(undefined)) {
  return {
    requestDevice: vi.fn().mockResolvedValue({
      gatt: {
        connect: vi.fn().mockResolvedValue({
          getPrimaryService: vi.fn().mockResolvedValue({
            getCharacteristic: vi.fn().mockResolvedValue({ writeValue }),
          }),
        }),
        disconnect: vi.fn(),
      },
    }),
  };
}

describe('EscPosBluetoothPrinter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia os bytes para a impressora', async () => {
    const writeValue = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { bluetooth: makeBluetooth(writeValue) });

    const printer = new EscPosBluetoothPrinter(80);
    const result = await printer.print(receipt);

    expect(isRight(result)).toBe(true);
    expect(writeValue).toHaveBeenCalled();
  });

  it('devolve erro quando o navegador não suporta Web Bluetooth', async () => {
    vi.stubGlobal('navigator', {});

    const printer = new EscPosBluetoothPrinter(80);
    const result = await printer.print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINTER_UNAVAILABLE');
  });

  it('devolve erro quando a conexão falha', async () => {
    vi.stubGlobal('navigator', {
      bluetooth: {
        requestDevice: vi.fn().mockRejectedValue(new Error('cancelado')),
      },
    });

    const printer = new EscPosBluetoothPrinter(80);
    const result = await printer.print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINT_FAILED');
  });

  it('devolve erro quando o dispositivo não expõe GATT', async () => {
    vi.stubGlobal('navigator', {
      bluetooth: {
        requestDevice: vi.fn().mockResolvedValue({}),
      },
    });

    const printer = new EscPosBluetoothPrinter(80);
    const result = await printer.print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINT_FAILED');
  });

  it('fatia o buffer em blocos de 512 bytes e desconecta ao final', async () => {
    const writeValue = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { bluetooth: makeBluetooth(writeValue) });

    const bigReceipt: Receipt = {
      ...receipt,
      lines: Array.from({ length: 100 }, (_, index) => ({
        label: `Item ${index} com nome bem grande para gerar bastante byte`,
        qty: 1,
        value: 'R$ 1,00',
      })),
    };

    const printer = new EscPosBluetoothPrinter(58);
    const result = await printer.print(bigReceipt);

    expect(isRight(result)).toBe(true);
    expect(writeValue.mock.calls.length).toBeGreaterThan(1);
    for (const call of writeValue.mock.calls) {
      expect((call[0] as Uint8Array).length).toBeLessThanOrEqual(512);
    }
  });

  it('devolve erro quando a escrita na característica falha', async () => {
    const writeValue = vi.fn().mockRejectedValue(new Error('sem conexão'));
    vi.stubGlobal('navigator', { bluetooth: makeBluetooth(writeValue) });

    const printer = new EscPosBluetoothPrinter(80);
    const result = await printer.print(receipt);

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('PRINT_FAILED');
  });

  it('imprime um cupom mínimo, sem ticket, cliente, total ou rodapé', async () => {
    const writeValue = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { bluetooth: makeBluetooth(writeValue) });

    const minimalReceipt: Receipt = {
      title: 'Estoque atual',
      businessName: 'Grupo Escoteiro',
      lines: [{ label: 'Refri' }],
      printedAt: 1000,
    };

    const printer = new EscPosBluetoothPrinter(58);
    const result = await printer.print(minimalReceipt);

    expect(isRight(result)).toBe(true);
  });

  it('desconecta mesmo quando a escrita falha', async () => {
    const writeValue = vi.fn().mockRejectedValue(new Error('sem conexão'));
    const disconnect = vi.fn();
    vi.stubGlobal('navigator', {
      bluetooth: {
        requestDevice: vi.fn().mockResolvedValue({
          gatt: {
            connect: vi.fn().mockResolvedValue({
              getPrimaryService: vi.fn().mockResolvedValue({
                getCharacteristic: vi.fn().mockResolvedValue({ writeValue }),
              }),
            }),
            disconnect,
          },
        }),
      },
    });

    const printer = new EscPosBluetoothPrinter(80);
    await printer.print(receipt);

    expect(disconnect).toHaveBeenCalled();
  });
});
