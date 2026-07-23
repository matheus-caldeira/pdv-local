import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { createUid } from '../../domain/shared/uid';
import { currentMonthKey } from '../../domain/finance/finance.rules';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceFormula,
  FinanceKind,
  InstallmentPlan,
  MonthKey,
  Recurrence,
} from '../../domain/finance/finance.entity';
import type {
  FormulaInput,
  FormulaPreview,
  FormulaPreviewInput,
  GenerateFormulaInput,
  InstallmentPreviewLine,
  RecurrenceInput,
} from '../../application/finance/automations.usecases';
import { useToast } from '../molecules/toast-context';

export interface InstallmentPlanInput {
  description: string;
  totalAmount: number;
  installmentCount: number;
  firstMonth: MonthKey;
  dayOfMonth: number;
  kind: FinanceKind;
  categoryUid: string;
  memberUids: string[];
}

export function useFinanceAutomations() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [formulas, setFormulas] = useState<FinanceFormula[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentMonth] = useState<MonthKey>(() => currentMonthKey(Date.now()));

  const load = useCallback(
    () =>
      Promise.all([
        container.listFinanceFormulas(),
        container.listFinanceRecurrences(),
        container.listFinanceInstallmentPlans(),
        container.listFinanceCategories(),
        container.listFinanceMembers(),
      ]).then(
        ([
          formulasResult,
          recurrencesResult,
          plansResult,
          categoriesResult,
          membersResult,
        ]) => {
          const showError = (error: AppError) => toast(error.message, 'error');
          fold(formulasResult, showError, (value) => setFormulas(value));
          fold(recurrencesResult, showError, (value) => setRecurrences(value));
          fold(plansResult, showError, (value) => setPlans(value));
          fold(categoriesResult, showError, (value) => setCategories(value));
          fold(membersResult, showError, (value) => setMembers(value));
          setLoading(false);
        },
      ),
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const runAction = useCallback(
    async <T>(
      promise: Promise<Either<AppError, T>>,
      successMessage: string,
    ) => {
      const result = await promise;
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(successMessage);
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const saveFormula = useCallback(
    (input: FormulaInput) =>
      runAction(container.saveFinanceFormula(input), 'Fórmula salva!'),
    [runAction],
  );

  const deleteFormula = useCallback(
    (uid: string) =>
      runAction(container.deleteFinanceFormula(uid), 'Fórmula excluída!'),
    [runAction],
  );

  const previewFormula = useCallback(
    async (input: FormulaPreviewInput): Promise<FormulaPreview | null> => {
      const result = await container.previewFinanceFormula(input);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return null;
        },
        (value) => value,
      );
    },
    [toast],
  );

  const generateFormulaEntry = useCallback(
    (input: GenerateFormulaInput) =>
      runAction(
        container.generateFinanceFormulaEntry(input),
        'Lançamento gerado!',
      ),
    [runAction],
  );

  const saveRecurrence = useCallback(
    (input: RecurrenceInput) =>
      runAction(container.saveFinanceRecurrence(input), 'Recorrência salva!'),
    [runAction],
  );

  const deleteRecurrence = useCallback(
    (uid: string) =>
      runAction(
        container.deleteFinanceRecurrence(uid),
        'Recorrência excluída!',
      ),
    [runAction],
  );

  const launchRecurrence = useCallback(
    (uid: string) =>
      runAction(
        container.launchFinanceRecurrence(uid, currentMonth),
        'Recorrência lançada!',
      ),
    [runAction, currentMonth],
  );

  const launchAllRecurrences = useCallback(async () => {
    const result = await container.launchAllFinanceRecurrences(currentMonth);
    return fold(
      result,
      (error) => {
        toast(error.message, 'error');
        return false;
      },
      (value) => {
        toast(`${value.launched} lançada(s), ${value.skipped} pulada(s)`);
        load();
        return true;
      },
    );
  }, [toast, load, currentMonth]);

  const createInstallmentPlan = useCallback(
    (input: InstallmentPlanInput) =>
      runAction(
        container.createFinanceInstallmentPlan({
          ...input,
          uid: createUid(),
          paymentMethodUid: null,
          createdAt: Date.now(),
        }),
        'Parcelamento criado!',
      ),
    [runAction],
  );

  const deleteInstallmentPlan = useCallback(
    (uid: string) =>
      runAction(
        container.deleteFinanceInstallmentPlan(uid),
        'Parcelamento excluído!',
      ),
    [runAction],
  );

  const previewInstallments = useCallback(
    (
      total: number,
      count: number,
      firstMonth: MonthKey,
    ): InstallmentPreviewLine[] | null => {
      const result = container.previewFinanceInstallments(
        total,
        count,
        firstMonth,
      );
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return null;
        },
        (value) => value,
      );
    },
    [toast],
  );

  return {
    loading,
    formulas,
    recurrences,
    plans,
    categories,
    members,
    currentMonth,
    load,
    saveFormula,
    deleteFormula,
    previewFormula,
    generateFormulaEntry,
    saveRecurrence,
    deleteRecurrence,
    launchRecurrence,
    launchAllRecurrences,
    createInstallmentPlan,
    deleteInstallmentPlan,
    previewInstallments,
  };
}
