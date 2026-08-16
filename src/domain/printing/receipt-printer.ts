import type { Either } from '../shared/either';
import type { AppError } from '../shared/errors';
import type { Receipt } from './receipt.entity';

export interface ReceiptPrinter {
  print(receipt: Receipt): Promise<Either<AppError, void>>;
}
