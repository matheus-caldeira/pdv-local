import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { FinanceCategory, FinanceKind } from './finance.entity';

export interface FinanceCategoryRepository {
  list(): Promise<Either<InfrastructureError, FinanceCategory[]>>;
  create(data: {
    name: string;
    kind: FinanceKind;
  }): Promise<Either<InfrastructureError, FinanceCategory>>;
  update(
    uid: string,
    changes: Partial<Pick<FinanceCategory, 'name' | 'archived'>>,
  ): Promise<Either<InfrastructureError, FinanceCategory>>;
  delete(uid: string): Promise<Either<InfrastructureError, void>>;
  ensureDefaults(
    defaults: { name: string; kind: FinanceKind }[],
  ): Promise<Either<InfrastructureError, FinanceCategory[] | null>>;
}
