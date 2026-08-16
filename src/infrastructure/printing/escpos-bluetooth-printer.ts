import EscPosEncoder from 'esc-pos-encoder';
import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { PrintFailedError, PrinterUnavailableError } from '../../domain/errors';
import { formatMoney } from '../../domain/shared/format';
import type { Receipt } from '../../domain/printing/receipt.entity';
import type { ReceiptPrinter } from '../../domain/printing/receipt-printer';

const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC = '00002af1-0000-1000-8000-00805f9b34fb';
const CHUNK_SIZE = 512;

const CHARS_BY_PAPER_WIDTH: Record<58 | 80, number> = {
  58: 32,
  80: 48,
};

function padLine(label: string, value: string, width: number): string {
  const spacing = Math.max(1, width - label.length - value.length);
  return label + ' '.repeat(spacing) + value;
}

function buildBytes(receipt: Receipt, width: number): Uint8Array {
  const encoder = new EscPosEncoder();
  encoder.codepage('cp860');
  encoder.align('center');
  encoder.line(receipt.businessName);
  encoder.line(receipt.title);
  if (receipt.ticket) encoder.line(receipt.ticket);
  if (receipt.customerName) encoder.line(receipt.customerName);
  encoder.align('left');

  for (const line of receipt.lines) {
    const label = line.qty ? `${line.qty}x ${line.label}` : line.label;
    const value = line.value ?? '';
    encoder.line(value ? padLine(label, value, width) : label);
  }

  if (receipt.total !== undefined) {
    encoder.bold(true);
    encoder.line(padLine('Total', formatMoney(receipt.total), width));
    encoder.bold(false);
  }

  if (receipt.footer) encoder.line(receipt.footer);

  encoder.newline();
  encoder.newline();
  encoder.newline();
  encoder.cut();

  return encoder.encode();
}

function chunk(bytes: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.slice(offset, offset + size));
  }
  return chunks;
}

export class EscPosBluetoothPrinter implements ReceiptPrinter {
  private readonly paperWidth: 58 | 80;

  constructor(paperWidth: 58 | 80) {
    this.paperWidth = paperWidth;
  }

  async print(receipt: Receipt): Promise<Either<AppError, void>> {
    const bluetooth = navigator.bluetooth;
    if (!bluetooth) return left(new PrinterUnavailableError());

    let deviceGatt: BluetoothRemoteGATTServer | undefined;
    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: [PRINTER_SERVICE] }],
        optionalServices: [PRINTER_SERVICE],
      });
      deviceGatt = device.gatt;
      if (!deviceGatt) return left(new PrintFailedError());
      const server = await deviceGatt.connect();

      const service = await server.getPrimaryService(PRINTER_SERVICE);
      const characteristic = await service.getCharacteristic(
        PRINTER_CHARACTERISTIC,
      );

      const bytes = buildBytes(receipt, CHARS_BY_PAPER_WIDTH[this.paperWidth]);
      for (const part of chunk(bytes, CHUNK_SIZE)) {
        await characteristic.writeValue(part);
      }

      return right(undefined);
    } catch {
      return left(new PrintFailedError());
    } finally {
      deviceGatt?.disconnect();
    }
  }
}
