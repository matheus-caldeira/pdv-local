import { createContext, useContext } from 'react';
import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Receipt } from '../../domain/printing/receipt.entity';

export type ReceiptPrintHandler = (
  receipt: Receipt,
) => Promise<Either<AppError, void>>;

export const ReceiptPrintContext = createContext<ReceiptPrintHandler | null>(
  null,
);

export function useReceiptPrintHandler(): ReceiptPrintHandler | null {
  return useContext(ReceiptPrintContext);
}
