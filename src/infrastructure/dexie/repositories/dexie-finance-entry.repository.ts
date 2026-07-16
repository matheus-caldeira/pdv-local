import { left, right, type Either } from '../../../domain/shared/either';
import type {
  EntryStatus,
  FinanceEntry,
  MonthKey,
  NewFinanceEntry,
} from '../../../domain/finance/finance.entity';
import type {
  FinanceEntryFilter,
  FinanceEntryRepository,
} from '../../../domain/finance/finance-entry.repository';
import { RecordNotFoundError, type InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

function matchesFilter(
  entry: FinanceEntry,
  filter: FinanceEntryFilter,
): boolean {
  if (filter.month !== undefined && entry.month !== filter.month) return false;
  if (filter.status !== undefined && entry.status !== filter.status)
    return false;
  if (filter.kind !== undefined && entry.kind !== filter.kind) return false;
  if (
    filter.categoryUid !== undefined &&
    entry.categoryUid !== filter.categoryUid
  )
    return false;
  if (
    filter.memberUid !== undefined &&
    !entry.memberUids.includes(filter.memberUid)
  )
    return false;
  if (
    filter.text !== undefined &&
    !entry.description.toLowerCase().includes(filter.text.toLowerCase())
  )
    return false;
  if (filter.sourceUid !== undefined && entry.sourceUid !== filter.sourceUid)
    return false;
  if (filter.source !== undefined && entry.source !== filter.source)
    return false;
  if (filter.monthBefore !== undefined && entry.month >= filter.monthBefore)
    return false;
  return true;
}

export class DexieFinanceEntryRepository implements FinanceEntryRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(
    filter: FinanceEntryFilter,
  ): Promise<Either<InfrastructureError, FinanceEntry[]>> {
    try {
      const entries = await this.db.financeEntries
        .filter((entry) => matchesFilter(entry, filter))
        .toArray();
      entries.sort((a, b) => a.date - b.date || a.createdAt - b.createdAt);
      return right(entries);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async findByUid(
    uid: string,
  ): Promise<Either<InfrastructureError, FinanceEntry | undefined>> {
    try {
      const entry = await this.db.financeEntries
        .where('uid')
        .equals(uid)
        .first();
      return right(entry);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    entry: NewFinanceEntry,
  ): Promise<Either<InfrastructureError, FinanceEntry>> {
    try {
      const id = await this.db.financeEntries.add(entry);
      return right({ ...entry, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async createMany(
    entries: NewFinanceEntry[],
  ): Promise<Either<InfrastructureError, FinanceEntry[]>> {
    try {
      const ids = await this.db.financeEntries.bulkAdd(entries, {
        allKeys: true,
      });
      return right(
        entries.map((entry, index) => ({ ...entry, id: ids[index] })),
      );
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    uid: string,
    changes: Partial<Omit<FinanceEntry, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, FinanceEntry>> {
    try {
      const existing = await this.db.financeEntries
        .where('uid')
        .equals(uid)
        .first();
      if (!existing?.id) {
        return left(new RecordNotFoundError('Lançamento não encontrado.'));
      }
      await this.db.financeEntries.update(existing.id, changes);
      return right({ ...existing, ...changes, uid, id: existing.id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeEntries.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async deleteBySource(
    sourceUid: string,
    onlyStatus: EntryStatus,
    excludeMonths: MonthKey[],
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const count = await this.db.financeEntries
        .where('sourceUid')
        .equals(sourceUid)
        .filter(
          (entry) =>
            entry.status === onlyStatus && !excludeMonths.includes(entry.month),
        )
        .delete();
      return right(count);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listPaid(): Promise<Either<InfrastructureError, FinanceEntry[]>> {
    try {
      const entries = await this.db.financeEntries
        .where('status')
        .equals('paid')
        .toArray();
      return right(entries);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async countByCategory(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const count = await this.db.financeEntries
        .where('categoryUid')
        .equals(categoryUid)
        .count();
      return right(count);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async countByMember(
    memberUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const count = await this.db.financeEntries
        .filter((entry) => entry.memberUids.includes(memberUid))
        .count();
      return right(count);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
