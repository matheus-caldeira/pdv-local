import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { PrintFailedError, PrinterUnavailableError } from '../../domain/errors';
import type {
  PaperWidth,
  PrinterCodepage,
} from '../../domain/printing/printer-driver';
import type { Receipt } from '../../domain/printing/receipt.entity';
import type { ReceiptPrinter } from '../../domain/printing/receipt-printer';
import { encodeReceipt } from './escpos-bytes';

const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC = '00002af1-0000-1000-8000-00805f9b34fb';
const CHUNK_SIZE = 512;

function chunk(bytes: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.slice(offset, offset + size));
  }
  return chunks;
}

export class EscPosBluetoothPrinter implements ReceiptPrinter {
  private readonly paperWidth: PaperWidth;
  private readonly codepage: PrinterCodepage;

  constructor(paperWidth: PaperWidth, codepage: PrinterCodepage = 'cp860') {
    this.paperWidth = paperWidth;
    this.codepage = codepage;
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

      const bytes = encodeReceipt(receipt, this.paperWidth, this.codepage);
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
