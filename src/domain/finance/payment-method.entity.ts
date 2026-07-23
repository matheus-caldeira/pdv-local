import type { MonthKey } from './finance.entity';

export type PaymentMethodType =
  | 'cash'
  | 'pix'
  | 'debit'
  | 'credit'
  | 'transfer'
  | 'other';

export interface PaymentMethod {
  id?: number;
  uid: string;
  name: string;
  type: PaymentMethodType;
  closingDay: number | null;
  dueDay: number | null;
  archived: boolean;
  createdAt: number;
}

export type NewPaymentMethod = Omit<PaymentMethod, 'id'>;

export type InvoiceStatus = 'open' | 'paid';

export interface CardInvoice {
  id?: number;
  uid: string;
  paymentMethodUid: string;
  month: MonthKey;
  dueDate: number;
  statedAmount: number | null;
  status: InvoiceStatus;
  paidAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type NewCardInvoice = Omit<CardInvoice, 'id'>;
