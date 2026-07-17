import { left, right, type Either } from '../../../domain/shared/either';
import type {
  MonthClosing,
  MonthKey,
  NewMonthClosing,
} from '../../../domain/finance/finance.entity';
import type { FinanceClosingRepository } from '../../../domain/finance/finance-closing.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieFinanceClosingRepository implements FinanceClosingRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(): Promise<Either<InfrastructureError, MonthClosing[]>> {
    try {
      const closings = await this.db.financeClosings.toArray();
      closings.sort((a, b) => b.month.localeCompare(a.month));
      return right(closings);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async findByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, MonthClosing | undefined>> {
    try {
      const closing = await this.db.financeClosings
        .where('month')
        .equals(month)
        .first();
      return right(closing);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listClosedMonths(): Promise<Either<InfrastructureError, MonthKey[]>> {
    try {
      const closings = await this.db.financeClosings.toArray();
      const months = closings.map((closing) => closing.month);
      months.sort((a, b) => a.localeCompare(b));
      return right(months);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    closing: NewMonthClosing,
  ): Promise<Either<InfrastructureError, MonthClosing>> {
    try {
      const id = await this.db.financeClosings.add(closing);
      return right({ ...closing, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async deleteByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeClosings.where('month').equals(month).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
