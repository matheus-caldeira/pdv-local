import { left, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { PrintFailedError, PrinterUnavailableError } from '../../domain/errors';
import type { Receipt } from '../../domain/printing/receipt.entity';
import type { ReceiptPrinter } from '../../domain/printing/receipt-printer';

export type PrintTrigger = (
  receipt: Receipt,
) => Promise<Either<AppError, void>>;

export class TriggeredReceiptPrinter implements ReceiptPrinter {
  private readonly trigger: PrintTrigger | null;

  constructor(trigger: PrintTrigger | null) {
    this.trigger = trigger;
  }

  async print(receipt: Receipt): Promise<Either<AppError, void>> {
    if (!this.trigger) return left(new PrinterUnavailableError());
    try {
      return await this.trigger(receipt);
    } catch {
      return left(new PrintFailedError());
    }
  }
}
