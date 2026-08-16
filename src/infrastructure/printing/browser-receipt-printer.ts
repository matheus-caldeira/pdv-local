import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { PrintFailedError } from '../../domain/errors';
import { formatMoney } from '../../domain/shared/format';
import type { Receipt } from '../../domain/printing/receipt.entity';
import type { ReceiptPrinter } from '../../domain/printing/receipt-printer';

const STYLE_ELEMENT_ID = 'receipt-print-style';

function buildStyle(paperWidth: 58 | 80): HTMLStyleElement {
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
@media print {
  body > *:not([data-receipt]) {
    display: none !important;
  }
  [data-receipt] {
    display: block !important;
    width: ${paperWidth}mm;
    font-family: monospace;
  }
  [data-receipt] .receipt-money {
    font-variant-numeric: tabular-nums;
  }
}
[data-receipt] {
  display: none;
}
`;
  return style;
}

function buildLineRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement('div');
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  const valueSpan = document.createElement('span');
  valueSpan.className = 'receipt-money';
  valueSpan.textContent = value;
  row.appendChild(labelSpan);
  row.appendChild(valueSpan);
  return row;
}

function buildReceiptElement(receipt: Receipt): HTMLDivElement {
  const container = document.createElement('div');
  container.setAttribute('data-receipt', '');

  const businessName = document.createElement('div');
  businessName.textContent = receipt.businessName;
  container.appendChild(businessName);

  const title = document.createElement('div');
  title.textContent = receipt.title;
  container.appendChild(title);

  if (receipt.ticket) {
    const ticket = document.createElement('div');
    ticket.textContent = receipt.ticket;
    container.appendChild(ticket);
  }

  if (receipt.customerName) {
    const customerName = document.createElement('div');
    customerName.textContent = receipt.customerName;
    container.appendChild(customerName);
  }

  for (const line of receipt.lines) {
    const label = line.qty ? `${line.qty}x ${line.label}` : line.label;
    container.appendChild(buildLineRow(label, line.value ?? ''));
  }

  if (receipt.total !== undefined) {
    container.appendChild(buildLineRow('Total', formatMoney(receipt.total)));
  }

  if (receipt.footer) {
    const footer = document.createElement('div');
    footer.textContent = receipt.footer;
    container.appendChild(footer);
  }

  return container;
}

export class BrowserReceiptPrinter implements ReceiptPrinter {
  private readonly paperWidth: 58 | 80;

  constructor(paperWidth: 58 | 80) {
    this.paperWidth = paperWidth;
  }

  async print(receipt: Receipt): Promise<Either<AppError, void>> {
    const style = buildStyle(this.paperWidth);
    const element = buildReceiptElement(receipt);
    document.head.appendChild(style);
    document.body.appendChild(element);

    try {
      window.print();
      return right(undefined);
    } catch {
      return left(new PrintFailedError());
    } finally {
      element.remove();
      style.remove();
    }
  }
}
