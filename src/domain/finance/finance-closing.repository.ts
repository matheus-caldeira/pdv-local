import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { MonthClosing, MonthKey, NewMonthClosing } from './finance.entity';

export interface FinanceClosingRepository {
  list(): Promise<Either<InfrastructureError, MonthClosing[]>>;
  findByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, MonthClosing | undefined>>;
  listClosedMonths(): Promise<Either<InfrastructureError, MonthKey[]>>;
  create(
    closing: NewMonthClosing,
  ): Promise<Either<InfrastructureError, MonthClosing>>;
  deleteByMonth(month: MonthKey): Promise<Either<InfrastructureError, void>>;
}
