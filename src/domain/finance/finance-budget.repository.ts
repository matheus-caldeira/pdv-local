import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { BudgetItem, MonthKey } from './finance.entity';

export interface FinanceBudgetRepository {
  listAll(): Promise<Either<InfrastructureError, BudgetItem[]>>;
  save(item: {
    categoryUid: string;
    month: MonthKey | null;
    amount: number;
  }): Promise<Either<InfrastructureError, BudgetItem>>;
  remove(uid: string): Promise<Either<InfrastructureError, void>>;
  countByCategory(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>>;
}
