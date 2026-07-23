import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { createUid } from '../../domain/shared/uid';
import {
  EmptyMemberSelectionError,
  FinanceFormulaNotFoundError,
  FormulaHasNoMatchesError,
  InstallmentPlanNotFoundError,
  InvalidMonthError,
  InvalidPercentError,
  InvalidRecurrenceRangeError,
  MonthClosedError,
  RecurrenceNotFoundError,
} from '../../domain/errors';
import type {
  FinanceEntry,
  FinanceFormula,
  FinanceKind,
  FormulaFilter,
  InstallmentPlan,
  MonthKey,
  NewFinanceEntry,
  NewInstallmentPlan,
  Recurrence,
} from '../../domain/finance/finance.entity';
import {
  addMonths,
  buildInstallmentAmounts,
  canLaunchRecurrence,
  compareMonths,
  dateForMonthDay,
  isValidMonthKey,
  matchesFormulaFilter,
  normalizeAmount,
  round2,
} from '../../domain/finance/finance.rules';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceAutomationRepository } from '../../domain/finance/finance-automation.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';

export interface FormulaInput {
  uid?: string;
  name: string;
  percent: number;
  filter: FormulaFilter;
  outputKind: FinanceKind;
  outputCategoryUid: string;
  outputDescription: string;
}

export interface FormulaPreviewInput {
  formulaUid: string;
  baseMonth: MonthKey;
  filter?: FormulaFilter;
}

export interface FormulaPreview {
  matches: FinanceEntry[];
  total: number;
  generatedAmount: number;
  previousGenerations: FinanceEntry[];
  defaultTargetMonth: MonthKey;
  closedMonths: MonthKey[];
}

export interface GenerateFormulaInput {
  formulaUid: string;
  baseMonth: MonthKey;
  filter: FormulaFilter;
  targetMonth: MonthKey;
}

export interface RecurrenceInput {
  uid?: string;
  description: string;
  amount: number;
  kind: FinanceKind;
  categoryUid: string;
  memberUids: string[];
  dayOfMonth: number;
  startMonth: MonthKey;
  endMonth: MonthKey | null;
  active: boolean;
}

export interface LaunchAllResult {
  launched: number;
  skipped: number;
}

export interface InstallmentPreviewLine {
  month: MonthKey;
  amount: number;
}

const isValidDayOfMonth = (day: number): boolean =>
  Number.isInteger(day) && day >= 1 && day <= 28;

const sumAmounts = (entries: FinanceEntry[]): number =>
  entries.reduce((sum, entry) => sum + entry.amount, 0);

const copyFilter = (filter: FormulaFilter): FormulaFilter => ({
  kind: filter.kind,
  categoryUids: [...filter.categoryUids],
  memberUids: [...filter.memberUids],
});

const ensureMonthOpen = async (
  closings: FinanceClosingRepository,
  month: MonthKey,
): Promise<Either<AppError, void>> => {
  const closing = await closings.findByMonth(month);
  if (isLeft(closing)) return closing;
  if (closing.right) return left(new MonthClosedError(month));
  return right(undefined);
};

const findFormula = async (
  automations: FinanceAutomationRepository,
  uid: string,
): Promise<Either<AppError, FinanceFormula>> => {
  const formulas = await automations.listFormulas();
  if (isLeft(formulas)) return formulas;
  const formula = formulas.right.find((candidate) => candidate.uid === uid);
  if (!formula) return left(new FinanceFormulaNotFoundError());
  return right(formula);
};

const findRecurrence = async (
  automations: FinanceAutomationRepository,
  uid: string,
): Promise<Either<AppError, Recurrence>> => {
  const recurrences = await automations.listRecurrences();
  if (isLeft(recurrences)) return recurrences;
  const recurrence = recurrences.right.find(
    (candidate) => candidate.uid === uid,
  );
  if (!recurrence) return left(new RecurrenceNotFoundError());
  return right(recurrence);
};

const alreadyLaunched = async (
  entries: FinanceEntryRepository,
  sourceUid: string,
  month: MonthKey,
): Promise<Either<AppError, boolean>> => {
  const launched = await entries.list({
    source: 'recurrence',
    sourceUid,
    month,
  });
  if (isLeft(launched)) return launched;
  return right(launched.right.length > 0);
};

const recurrenceEntry = (
  recurrence: Recurrence,
  month: MonthKey,
): NewFinanceEntry => {
  const now = Date.now();
  return {
    uid: createUid(),
    description: recurrence.description,
    amount: recurrence.amount,
    kind: recurrence.kind,
    categoryUid: recurrence.categoryUid,
    memberUids: [...recurrence.memberUids],
    date: dateForMonthDay(month, recurrence.dayOfMonth),
    month,
    status: 'pending',
    source: 'recurrence',
    sourceUid: recurrence.uid,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    paymentMethodUid: null,
    invoiceMonth: null,
    invoiceUid: null,
    createdAt: now,
    updatedAt: now,
  };
};

export function makeListFormulas(automations: FinanceAutomationRepository) {
  return async (): Promise<Either<AppError, FinanceFormula[]>> =>
    automations.listFormulas();
}

export function makeSaveFormula(automations: FinanceAutomationRepository) {
  return async (
    input: FormulaInput,
  ): Promise<Either<AppError, FinanceFormula>> => {
    if (!Number.isFinite(input.percent) || input.percent <= 0) {
      return left(new InvalidPercentError());
    }
    const now = Date.now();
    if (input.uid === undefined) {
      return automations.saveFormula({
        uid: createUid(),
        name: input.name,
        percent: input.percent,
        filter: copyFilter(input.filter),
        outputKind: input.outputKind,
        outputCategoryUid: input.outputCategoryUid,
        outputDescription: input.outputDescription,
        createdAt: now,
        updatedAt: now,
      });
    }
    const existing = await findFormula(automations, input.uid);
    if (isLeft(existing)) return existing;
    return automations.saveFormula({
      ...existing.right,
      name: input.name,
      percent: input.percent,
      filter: copyFilter(input.filter),
      outputKind: input.outputKind,
      outputCategoryUid: input.outputCategoryUid,
      outputDescription: input.outputDescription,
      updatedAt: now,
    });
  };
}

export function makeDeleteFormula(automations: FinanceAutomationRepository) {
  return async (uid: string): Promise<Either<AppError, void>> =>
    automations.deleteFormula(uid);
}

export function makePreviewFormula(
  entries: FinanceEntryRepository,
  automations: FinanceAutomationRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    input: FormulaPreviewInput,
  ): Promise<Either<AppError, FormulaPreview>> => {
    const formula = await findFormula(automations, input.formulaUid);
    if (isLeft(formula)) return formula;

    const filter = input.filter ?? formula.right.filter;
    const baseEntries = await entries.list({ month: input.baseMonth });
    if (isLeft(baseEntries)) return baseEntries;

    const matches = baseEntries.right.filter((entry) =>
      matchesFormulaFilter(entry, filter),
    );

    const generated = await entries.list({
      source: 'formula',
      sourceUid: formula.right.uid,
    });
    if (isLeft(generated)) return generated;

    const closedMonths = await closings.listClosedMonths();
    if (isLeft(closedMonths)) return closedMonths;

    const total = sumAmounts(matches);
    return right({
      matches,
      total: round2(total),
      generatedAmount: round2((total * formula.right.percent) / 100),
      previousGenerations: generated.right.filter(
        (entry) => entry.formulaBaseMonth === input.baseMonth,
      ),
      defaultTargetMonth: addMonths(input.baseMonth, 1),
      closedMonths: closedMonths.right,
    });
  };
}

export function makeGenerateFormulaEntry(
  entries: FinanceEntryRepository,
  automations: FinanceAutomationRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    input: GenerateFormulaInput,
  ): Promise<Either<AppError, FinanceEntry>> => {
    const formula = await findFormula(automations, input.formulaUid);
    if (isLeft(formula)) return formula;

    const baseEntries = await entries.list({ month: input.baseMonth });
    if (isLeft(baseEntries)) return baseEntries;

    const matches = baseEntries.right.filter((entry) =>
      matchesFormulaFilter(entry, input.filter),
    );
    if (matches.length === 0) return left(new FormulaHasNoMatchesError());

    const amount = normalizeAmount(
      (sumAmounts(matches) * formula.right.percent) / 100,
    );
    if (isLeft(amount)) return amount;

    const open = await ensureMonthOpen(closings, input.targetMonth);
    if (isLeft(open)) return open;

    const now = Date.now();
    return entries.create({
      uid: createUid(),
      description: `${formula.right.outputDescription} — ${input.baseMonth}`,
      amount: amount.right,
      kind: formula.right.outputKind,
      categoryUid: formula.right.outputCategoryUid,
      memberUids: [...new Set(matches.flatMap((entry) => entry.memberUids))],
      date: dateForMonthDay(input.targetMonth, 1),
      month: input.targetMonth,
      status: 'pending',
      source: 'formula',
      sourceUid: formula.right.uid,
      installmentNumber: null,
      sourceEntryUids: matches.map((entry) => entry.uid),
      formulaBaseMonth: input.baseMonth,
      paymentMethodUid: null,
      invoiceMonth: null,
      invoiceUid: null,
      createdAt: now,
      updatedAt: now,
    });
  };
}

export function makeListRecurrences(automations: FinanceAutomationRepository) {
  return async (): Promise<Either<AppError, Recurrence[]>> =>
    automations.listRecurrences();
}

const validateRecurrenceInput = (
  input: RecurrenceInput,
): Either<AppError, number> => {
  const amount = normalizeAmount(input.amount);
  if (isLeft(amount)) return amount;
  if (input.memberUids.length === 0) {
    return left(new EmptyMemberSelectionError());
  }
  if (!isValidDayOfMonth(input.dayOfMonth)) {
    return left(new InvalidRecurrenceRangeError());
  }
  if (!isValidMonthKey(input.startMonth)) {
    return left(new InvalidMonthError(input.startMonth));
  }
  if (input.endMonth !== null && !isValidMonthKey(input.endMonth)) {
    return left(new InvalidMonthError(input.endMonth));
  }
  if (
    input.endMonth !== null &&
    compareMonths(input.startMonth, input.endMonth) > 0
  ) {
    return left(new InvalidRecurrenceRangeError());
  }
  return amount;
};

export function makeSaveRecurrence(automations: FinanceAutomationRepository) {
  return async (
    input: RecurrenceInput,
  ): Promise<Either<AppError, Recurrence>> => {
    const amount = validateRecurrenceInput(input);
    if (isLeft(amount)) return amount;

    const now = Date.now();
    const data = {
      description: input.description,
      amount: amount.right,
      kind: input.kind,
      categoryUid: input.categoryUid,
      memberUids: [...input.memberUids],
      dayOfMonth: input.dayOfMonth,
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      active: input.active,
      paymentMethodUid: null,
    };
    if (input.uid === undefined) {
      return automations.saveRecurrence({
        ...data,
        uid: createUid(),
        createdAt: now,
        updatedAt: now,
      });
    }
    const existing = await findRecurrence(automations, input.uid);
    if (isLeft(existing)) return existing;
    return automations.saveRecurrence({
      ...existing.right,
      ...data,
      updatedAt: now,
    });
  };
}

export function makeDeleteRecurrence(automations: FinanceAutomationRepository) {
  return async (uid: string): Promise<Either<AppError, void>> =>
    automations.deleteRecurrence(uid);
}

export function makeLaunchRecurrence(
  entries: FinanceEntryRepository,
  automations: FinanceAutomationRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    uid: string,
    month: MonthKey,
  ): Promise<Either<AppError, FinanceEntry>> => {
    const recurrence = await findRecurrence(automations, uid);
    if (isLeft(recurrence)) return recurrence;

    const launched = await alreadyLaunched(entries, uid, month);
    if (isLeft(launched)) return launched;

    const closing = await closings.findByMonth(month);
    if (isLeft(closing)) return closing;

    const allowed = canLaunchRecurrence(
      recurrence.right,
      month,
      launched.right,
      closing.right !== undefined,
    );
    if (isLeft(allowed)) return allowed;

    return entries.create(recurrenceEntry(recurrence.right, month));
  };
}

export function makeLaunchAllRecurrences(
  entries: FinanceEntryRepository,
  automations: FinanceAutomationRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    month: MonthKey,
  ): Promise<Either<AppError, LaunchAllResult>> => {
    const open = await ensureMonthOpen(closings, month);
    if (isLeft(open)) return open;

    const recurrences = await automations.listRecurrences();
    if (isLeft(recurrences)) return recurrences;

    let launchedCount = 0;
    let skippedCount = 0;
    for (const recurrence of recurrences.right) {
      const launched = await alreadyLaunched(entries, recurrence.uid, month);
      if (isLeft(launched)) return launched;

      const allowed = canLaunchRecurrence(
        recurrence,
        month,
        launched.right,
        false,
      );
      if (isLeft(allowed)) {
        skippedCount += 1;
        continue;
      }

      const created = await entries.create(recurrenceEntry(recurrence, month));
      if (isLeft(created)) return created;
      launchedCount += 1;
    }
    return right({ launched: launchedCount, skipped: skippedCount });
  };
}

export function makeListPlans(automations: FinanceAutomationRepository) {
  return async (): Promise<Either<AppError, InstallmentPlan[]>> =>
    automations.listPlans();
}

export function makePreviewInstallments() {
  return (
    total: number,
    count: number,
    firstMonth: MonthKey,
  ): Either<AppError, InstallmentPreviewLine[]> => {
    const totalAmount = normalizeAmount(total);
    if (isLeft(totalAmount)) return totalAmount;
    const amounts = buildInstallmentAmounts(totalAmount.right, count);
    if (isLeft(amounts)) return amounts;
    return right(
      amounts.right.map((amount, index) => ({
        month: addMonths(firstMonth, index),
        amount,
      })),
    );
  };
}

export function makeCreateInstallmentPlan(uow: UnitOfWork) {
  return async (
    input: NewInstallmentPlan,
  ): Promise<Either<AppError, InstallmentPlan>> => {
    const totalAmount = normalizeAmount(input.totalAmount);
    if (isLeft(totalAmount)) return totalAmount;
    const amounts = buildInstallmentAmounts(
      totalAmount.right,
      input.installmentCount,
    );
    if (isLeft(amounts)) return amounts;
    if (input.memberUids.length === 0) {
      return left(new EmptyMemberSelectionError());
    }
    if (!isValidDayOfMonth(input.dayOfMonth)) {
      return left(new InvalidRecurrenceRangeError());
    }
    if (!isValidMonthKey(input.firstMonth)) {
      return left(new InvalidMonthError(input.firstMonth));
    }

    const months = amounts.right.map((_amount, index) =>
      addMonths(input.firstMonth, index),
    );
    return uow.run(async (repositories) => {
      const closedMonths =
        await repositories.financeClosings.listClosedMonths();
      if (isLeft(closedMonths)) return closedMonths;

      const closedTarget = months.find((month) =>
        closedMonths.right.includes(month),
      );
      if (closedTarget !== undefined) {
        return left(new MonthClosedError(closedTarget));
      }

      const plan = await repositories.financeAutomations.createPlan({
        ...input,
        totalAmount: totalAmount.right,
      });
      if (isLeft(plan)) return plan;

      const now = Date.now();
      const installmentEntries = amounts.right.map(
        (amount, index): NewFinanceEntry => ({
          uid: createUid(),
          description: `${input.description} (${index + 1}/${input.installmentCount})`,
          amount,
          kind: input.kind,
          categoryUid: input.categoryUid,
          memberUids: [...input.memberUids],
          date: dateForMonthDay(months[index], input.dayOfMonth),
          month: months[index],
          status: 'pending',
          source: 'installment',
          sourceUid: plan.right.uid,
          installmentNumber: index + 1,
          sourceEntryUids: [],
          formulaBaseMonth: null,
          paymentMethodUid: null,
          invoiceMonth: null,
          invoiceUid: null,
          createdAt: now,
          updatedAt: now,
        }),
      );
      const created =
        await repositories.financeEntries.createMany(installmentEntries);
      if (isLeft(created)) return created;

      return plan;
    });
  };
}

export function makeDeleteInstallmentPlan(uow: UnitOfWork) {
  return async (uid: string): Promise<Either<AppError, void>> =>
    uow.run(async (repositories) => {
      const plans = await repositories.financeAutomations.listPlans();
      if (isLeft(plans)) return plans;
      if (!plans.right.some((plan) => plan.uid === uid)) {
        return left(new InstallmentPlanNotFoundError());
      }

      const closedMonths =
        await repositories.financeClosings.listClosedMonths();
      if (isLeft(closedMonths)) return closedMonths;

      const deleted = await repositories.financeEntries.deleteBySource(
        uid,
        'pending',
        closedMonths.right,
      );
      if (isLeft(deleted)) return deleted;

      return repositories.financeAutomations.deletePlan(uid);
    });
}
