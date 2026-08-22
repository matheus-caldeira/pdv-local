import EscPosEncoder from 'esc-pos-encoder';
import {
  CHARS_BY_PAPER_WIDTH,
  type PaperWidth,
  type PrinterCodepage,
} from '../../domain/printing/printer-driver';
import { buildReceiptLayout } from '../../domain/printing/receipt.layout';
import type { Receipt } from '../../domain/printing/receipt.entity';

export function encodeReceipt(
  receipt: Receipt,
  paperWidth: PaperWidth,
  codepage: PrinterCodepage,
): Uint8Array {
  const encoder = new EscPosEncoder({
    width: CHARS_BY_PAPER_WIDTH[paperWidth],
  });
  encoder.codepage(codepage);

  for (const line of buildReceiptLayout(receipt, paperWidth)) {
    encoder.align(line.align);
    if (line.bold) encoder.bold(true);
    encoder.line(line.text);
    if (line.bold) encoder.bold(false);
  }

  encoder.align('left');
  encoder.newline();
  encoder.newline();
  encoder.newline();
  encoder.cut();

  return encoder.encode();
}
