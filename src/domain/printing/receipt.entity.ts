export interface ReceiptLine {
  label: string;
  value?: string;
  qty?: number;
  emphasis?: boolean;
}

export interface Receipt {
  title: string;
  businessName: string;
  ticket?: string;
  customerName?: string;
  lines: ReceiptLine[];
  total?: number;
  footer?: string;
  printedAt: number;
}
