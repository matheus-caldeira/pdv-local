import { useCallback, useEffect, useMemo, useState } from 'react';
import { container } from '../../app/container';
import { fold, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { EntryInput } from '../../application/finance/entries.usecases';
import type {
  EntryStatus,
  FamilyMember,
  FinanceCategory,
  FinanceEntry,
  FinanceKind,
  InstallmentPlan,
  MonthKey,
} from '../../domain/finance/finance.entity';
import type { FinanceEntryFilter } from '../../domain/finance/finance-entry.repository';
import type { PaymentMethod } from '../../domain/finance/payment-method.entity';
import { useToast } from '../molecules/toast-context';

export interface FinanceEntryFiltersState {
  status: EntryStatus | '';
  kind: FinanceKind | '';
  categoryUid: string;
  memberUid: string;
  paymentMethodUid: string;
  text: string;
}

export const EMPTY_FINANCE_ENTRY_FILTERS: FinanceEntryFiltersState = {
  status: '',
  kind: '',
  categoryUid: '',
  memberUid: '',
  paymentMethodUid: '',
  text: '',
};

function buildFilter(
  month: MonthKey,
  filters: FinanceEntryFiltersState,
): FinanceEntryFilter {
  const filter: FinanceEntryFilter = { month };
  if (filters.status) filter.status = filters.status;
  if (filters.kind) filter.kind = filters.kind;
  if (filters.categoryUid) filter.categoryUid = filters.categoryUid;
  if (filters.memberUid) filter.memberUid = filters.memberUid;
  if (filters.paymentMethodUid) {
    filter.paymentMethodUid = filters.paymentMethodUid;
  }
  if (filters.text.trim()) filter.text = filters.text.trim();
  return filter;
}

export function useFinanceEntries(month: MonthKey) {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_FINANCE_ENTRY_FILTERS);
  const [overdueMode, setOverdueMode] = useState(false);
  const [monthEntries, setMonthEntries] = useState<FinanceEntry[] | null>(null);
  const [overdueEntries, setOverdueEntries] = useState<FinanceEntry[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [closedMonths, setClosedMonths] = useState<MonthKey[]>([]);

  const reportError = useCallback(
    (error: { message: string }) => toast(error.message, 'error'),
    [toast],
  );

  const loadOptions = useCallback(async () => {
    const [
      categoriesResult,
      membersResult,
      plansResult,
      paymentMethodsResult,
      closingsResult,
    ] = await Promise.all([
      container.listFinanceCategories(),
      container.listFinanceMembers(),
      container.listFinanceInstallmentPlans(),
      container.listPaymentMethods(),
      container.listFinanceClosings(),
    ]);
    fold(categoriesResult, reportError, setCategories);
    fold(membersResult, reportError, setMembers);
    fold(plansResult, reportError, setPlans);
    fold(paymentMethodsResult, reportError, setPaymentMethods);
    fold(closingsResult, reportError, (closings) =>
      setClosedMonths(closings.map((closing) => closing.month)),
    );
  }, [reportError]);

  const loadEntries = useCallback(async () => {
    const [entriesResult, overdueResult] = await Promise.all([
      container.listFinanceEntries(buildFilter(month, filters)),
      container.listOverdueFinanceEntries(Date.now()),
    ]);
    fold(
      entriesResult,
      (error) => {
        reportError(error);
        setMonthEntries([]);
      },
      setMonthEntries,
    );
    fold(overdueResult, reportError, setOverdueEntries);
  }, [month, filters, reportError]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const runAction = useCallback(
    async <A>(
      action: Promise<Either<AppError, A>>,
      successMessage: string,
    ): Promise<boolean> => {
      const result = await action;
      return fold(
        result,
        (error) => {
          reportError(error);
          return false;
        },
        () => {
          toast(successMessage);
          loadEntries();
          return true;
        },
      );
    },
    [reportError, toast, loadEntries],
  );

  const createEntry = useCallback(
    (input: EntryInput) =>
      runAction(container.createFinanceEntry(input), 'Lançamento criado'),
    [runAction],
  );

  const updateEntry = useCallback(
    (uid: string, input: EntryInput) =>
      runAction(
        container.updateFinanceEntry(uid, input),
        'Lançamento atualizado',
      ),
    [runAction],
  );

  const deleteEntry = useCallback(
    (uid: string) =>
      runAction(container.deleteFinanceEntry(uid), 'Lançamento excluído'),
    [runAction],
  );

  const setEntryStatus = useCallback(
    (uid: string, status: EntryStatus) =>
      runAction(
        container.setFinanceEntryStatus(uid, status),
        status === 'paid' ? 'Marcado como pago' : 'Marcado como pendente',
      ),
    [runAction],
  );

  const loading = monthEntries === null;
  const entries = overdueMode ? overdueEntries : (monthEntries ?? []);
  const overdueCount = overdueEntries.length;
  const isMonthClosed = closedMonths.includes(month);
  const planCounts = useMemo(
    () =>
      Object.fromEntries(
        plans.map((plan) => [plan.uid, plan.installmentCount]),
      ) as Record<string, number>,
    [plans],
  );

  return {
    loading,
    entries,
    overdueCount,
    categories,
    members,
    paymentMethods,
    planCounts,
    closedMonths,
    isMonthClosed,
    filters,
    setFilters,
    overdueMode,
    setOverdueMode,
    createEntry,
    updateEntry,
    deleteEntry,
    setEntryStatus,
  };
}
