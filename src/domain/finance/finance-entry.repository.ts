import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type {
  EntrySource,
  EntryStatus,
  FinanceEntry,
  FinanceKind,
  MonthKey,
  NewFinanceEntry,
} from './finance.entity';

export interface FinanceEntryFilter {
  month?: MonthKey;
  status?: EntryStatus;
  kind?: FinanceKind;
  categoryUid?: string;
  memberUid?: string;
  text?: string;
  sourceUid?: string;
  source?: EntrySource;
  monthBefore?: MonthKey;
  paymentMethodUid?: string;
  invoiceMonth?: MonthKey;
  invoiceUid?: string;
}

export interface FinanceEntryRepository {
  list(
    filter: FinanceEntryFilter,
  ): Promise<Either<InfrastructureError, FinanceEntry[]>>;
  findByUid(
    uid: string,
  ): Promise<Either<InfrastructureError, FinanceEntry | undefined>>;
  create(
    entry: NewFinanceEntry,
  ): Promise<Either<InfrastructureError, FinanceEntry>>;
  createMany(
    entries: NewFinanceEntry[],
  ): Promise<Either<InfrastructureError, FinanceEntry[]>>;
  update(
    uid: string,
    changes: Partial<Omit<FinanceEntry, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, FinanceEntry>>;
  delete(uid: string): Promise<Either<InfrastructureError, void>>;
  deleteBySource(
    sourceUid: string,
    onlyStatus: EntryStatus,
    excludeMonths: MonthKey[],
  ): Promise<Either<InfrastructureError, number>>;
  listPaid(): Promise<Either<InfrastructureError, FinanceEntry[]>>;
  countByCategory(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>>;
  countByMember(
    memberUid: string,
  ): Promise<Either<InfrastructureError, number>>;
}
