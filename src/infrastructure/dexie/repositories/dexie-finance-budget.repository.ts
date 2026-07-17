import { left, right, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type {
  BudgetItem,
  MonthKey,
} from '../../../domain/finance/finance.entity';
import type { FinanceBudgetRepository } from '../../../domain/finance/finance-budget.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieFinanceBudgetRepository implements FinanceBudgetRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async listAll(): Promise<Either<InfrastructureError, BudgetItem[]>> {
    try {
      const items = await this.db.financeBudgetItems.toArray();
      return right(items);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async save(item: {
    categoryUid: string;
    month: MonthKey | null;
    amount: number;
  }): Promise<Either<InfrastructureError, BudgetItem>> {
    try {
      const saved = await this.db.transaction(
        'rw',
        this.db.financeBudgetItems,
        async () => {
          const now = Date.now();
          const existing = await this.db.financeBudgetItems
            .where('categoryUid')
            .equals(item.categoryUid)
            .filter((stored) => stored.month === item.month)
            .first();
          if (existing?.id) {
            const next = { ...existing, amount: item.amount, updatedAt: now };
            await this.db.financeBudgetItems.put(next);
            return next;
          }
          const created = {
            uid: createUid(),
            categoryUid: item.categoryUid,
            month: item.month,
            amount: item.amount,
            createdAt: now,
            updatedAt: now,
          };
          const id = await this.db.financeBudgetItems.add(created);
          return { ...created, id };
        },
      );
      return right(saved);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async remove(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeBudgetItems.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async countByCategory(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const count = await this.db.financeBudgetItems
        .where('categoryUid')
        .equals(categoryUid)
        .count();
      return right(count);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
