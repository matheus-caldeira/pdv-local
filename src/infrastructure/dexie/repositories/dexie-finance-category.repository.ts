import { left, right, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type {
  FinanceCategory,
  FinanceKind,
} from '../../../domain/finance/finance.entity';
import type { FinanceCategoryRepository } from '../../../domain/finance/finance-category.repository';
import { RecordNotFoundError, type InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieFinanceCategoryRepository implements FinanceCategoryRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(): Promise<Either<InfrastructureError, FinanceCategory[]>> {
    try {
      const categories = await this.db.financeCategories.toArray();
      categories.sort((a, b) => a.name.localeCompare(b.name));
      return right(categories);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(data: {
    name: string;
    kind: FinanceKind;
  }): Promise<Either<InfrastructureError, FinanceCategory>> {
    try {
      const category = {
        uid: createUid(),
        name: data.name,
        kind: data.kind,
        archived: false,
        createdAt: Date.now(),
      };
      const id = await this.db.financeCategories.add(category);
      return right({ ...category, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    uid: string,
    changes: Partial<Pick<FinanceCategory, 'name' | 'archived'>>,
  ): Promise<Either<InfrastructureError, FinanceCategory>> {
    try {
      const existing = await this.db.financeCategories
        .where('uid')
        .equals(uid)
        .first();
      if (!existing?.id) {
        return left(new RecordNotFoundError('Categoria não encontrada.'));
      }
      await this.db.financeCategories.update(existing.id, changes);
      return right({ ...existing, ...changes });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeCategories.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async ensureDefaults(
    defaults: { name: string; kind: FinanceKind }[],
  ): Promise<Either<InfrastructureError, FinanceCategory[] | null>> {
    try {
      const created = await this.db.transaction(
        'rw',
        this.db.financeCategories,
        async () => {
          const count = await this.db.financeCategories.count();
          if (count > 0) return null;
          const now = Date.now();
          const categories = defaults.map((item) => ({
            uid: createUid(),
            name: item.name,
            kind: item.kind,
            archived: false,
            createdAt: now,
          }));
          const ids = await this.db.financeCategories.bulkAdd(categories, {
            allKeys: true,
          });
          return categories.map((category, index) => ({
            ...category,
            id: ids[index],
          }));
        },
      );
      return right(created);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
