import { formatMoney } from '../shared/format';
import { CHARS_BY_PAPER_WIDTH, type PaperWidth } from './printer-driver';
import type { Receipt } from './receipt.entity';

export interface ReceiptLayoutLine {
  text: string;
  align: 'left' | 'center';
  bold: boolean;
}

function padLine(label: string, value: string, width: number): string {
  const spacing = Math.max(1, width - label.length - value.length);
  return label + ' '.repeat(spacing) + value;
}

export function buildReceiptLayout(
  receipt: Receipt,
  paperWidth: PaperWidth,
): ReceiptLayoutLine[] {
  const width = CHARS_BY_PAPER_WIDTH[paperWidth];
  const layout: ReceiptLayoutLine[] = [
    { text: receipt.businessName, align: 'center', bold: true },
    { text: receipt.title, align: 'center', bold: false },
  ];

  if (receipt.ticket) {
    layout.push({ text: receipt.ticket, align: 'center', bold: true });
  }

  if (receipt.customerName) {
    layout.push({ text: receipt.customerName, align: 'center', bold: false });
  }

  for (const line of receipt.lines) {
    const label = line.qty ? `${line.qty}x ${line.label}` : line.label;
    layout.push({
      text: line.value ? padLine(label, line.value, width) : label,
      align: 'left',
      bold: line.emphasis ?? false,
    });
  }

  if (receipt.total !== undefined) {
    layout.push({
      text: padLine('Total', formatMoney(receipt.total), width),
      align: 'left',
      bold: true,
    });
  }

  if (receipt.footer) {
    layout.push({ text: receipt.footer, align: 'center', bold: false });
  }

  return layout;
}
