import { isLeft, left, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { FinanceCategoryInUseError } from '../../domain/errors';
import type {
  FinanceCategory,
  FinanceKind,
} from '../../domain/finance/finance.entity';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceBudgetRepository } from '../../domain/finance/finance-budget.repository';
import type { FinanceAutomationRepository } from '../../domain/finance/finance-automation.repository';

export interface CategoryInput {
  name: string;
  kind: FinanceKind;
}

export interface CategoryChanges {
  name?: string;
  archived?: boolean;
}

export function makeListCategories(categories: FinanceCategoryRepository) {
  return async (): Promise<Either<AppError, FinanceCategory[]>> =>
    categories.list();
}

export function makeCreateCategory(categories: FinanceCategoryRepository) {
  return async (
    input: CategoryInput,
  ): Promise<Either<AppError, FinanceCategory>> =>
    categories.create({ name: input.name.trim(), kind: input.kind });
}

export function makeUpdateCategory(categories: FinanceCategoryRepository) {
  return async (
    uid: string,
    changes: CategoryChanges,
  ): Promise<Either<AppError, FinanceCategory>> => {
    const normalized =
      changes.name === undefined
        ? changes
        : { ...changes, name: changes.name.trim() };
    return categories.update(uid, normalized);
  };
}

export function makeDeleteCategory(
  categories: FinanceCategoryRepository,
  entries: FinanceEntryRepository,
  budget: FinanceBudgetRepository,
  automations: FinanceAutomationRepository,
) {
  return async (uid: string): Promise<Either<AppError, void>> => {
    const entryRefs = await entries.countByCategory(uid);
    if (isLeft(entryRefs)) return entryRefs;

    const budgetRefs = await budget.countByCategory(uid);
    if (isLeft(budgetRefs)) return budgetRefs;

    const automationRefs = await automations.countCategoryRefs(uid);
    if (isLeft(automationRefs)) return automationRefs;

    if (entryRefs.right + budgetRefs.right + automationRefs.right > 0) {
      return left(new FinanceCategoryInUseError());
    }

    return categories.delete(uid);
  };
}
