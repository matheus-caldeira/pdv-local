import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { PrintFailedError } from '../../domain/errors';
import type {
  PaperWidth,
  PrinterCodepage,
} from '../../domain/printing/printer-driver';
import type { Receipt } from '../../domain/printing/receipt.entity';
import type { ReceiptPrinter } from '../../domain/printing/receipt-printer';
import { encodeReceipt } from './escpos-bytes';

const DEEP_LINK_SCHEME = 'rawbt:';
const DECODE_CHUNK_SIZE = 8192;

function toBinaryString(bytes: Uint8Array): string {
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += DECODE_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + DECODE_CHUNK_SIZE);
    result += String.fromCharCode(...chunk);
  }
  return result;
}

export class RawBtReceiptPrinter implements ReceiptPrinter {
  private readonly paperWidth: PaperWidth;
  private readonly codepage: PrinterCodepage;

  constructor(paperWidth: PaperWidth, codepage: PrinterCodepage = 'cp860') {
    this.paperWidth = paperWidth;
    this.codepage = codepage;
  }

  async print(receipt: Receipt): Promise<Either<AppError, void>> {
    try {
      const bytes = encodeReceipt(receipt, this.paperWidth, this.codepage);
      const payload = encodeURIComponent(toBinaryString(bytes));
      window.location.href = `${DEEP_LINK_SCHEME}${payload}`;
      return right(undefined);
    } catch {
      return left(new PrintFailedError());
    }
  }
}
