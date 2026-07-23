import type { MonthKey } from './finance.entity';
import {
  addMonths,
  dateForMonthDay,
  lastDayOfMonth,
  monthKeyFromDate,
  round2,
} from './finance.rules';

export interface ResolvedInvoice {
  month: MonthKey;
  dueDate: number;
}

export function resolveInvoiceMonth(
  purchaseDate: number,
  closingDay: number,
  dueDay: number,
): ResolvedInvoice {
  const purchaseMonth = monthKeyFromDate(purchaseDate);
  const [year, monthNumber] = purchaseMonth.split('-').map(Number);
  const effectiveClosingDay = Math.min(
    closingDay,
    lastDayOfMonth(year, monthNumber),
  );
  const closedInPurchaseMonth =
    new Date(purchaseDate).getDate() < effectiveClosingDay;
  const closingMonth = closedInPurchaseMonth
    ? purchaseMonth
    : addMonths(purchaseMonth, 1);
  const month = dueDay > closingDay ? closingMonth : addMonths(closingMonth, 1);
  return { month, dueDate: dateForMonthDay(month, dueDay) };
}

export type ReconcileResult =
  | { kind: 'adjustment'; amount: number }
  | { kind: 'balanced' }
  | { kind: 'over'; excess: number };

export function reconcileInvoice(
  statedAmount: number | null,
  detailedTotal: number,
): ReconcileResult {
  if (statedAmount === null) return { kind: 'balanced' };
  const difference = round2(statedAmount - detailedTotal);
  if (difference === 0) return { kind: 'balanced' };
  if (difference < 0) return { kind: 'over', excess: round2(-difference) };
  return { kind: 'adjustment', amount: difference };
}
