import { left, right, type Either } from '../../../domain/shared/either';
import type {
  FinanceFormula,
  InstallmentPlan,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewRecurrence,
  Recurrence,
} from '../../../domain/finance/finance.entity';
import type { FinanceAutomationRepository } from '../../../domain/finance/finance-automation.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieFinanceAutomationRepository implements FinanceAutomationRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async listFormulas(): Promise<Either<InfrastructureError, FinanceFormula[]>> {
    try {
      const formulas = await this.db.financeFormulas.toArray();
      formulas.sort((a, b) => a.name.localeCompare(b.name));
      return right(formulas);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async saveFormula(
    data: NewFinanceFormula | FinanceFormula,
  ): Promise<Either<InfrastructureError, FinanceFormula>> {
    try {
      const existing = await this.db.financeFormulas
        .where('uid')
        .equals(data.uid)
        .first();
      if (existing?.id) {
        const next = { ...data, id: existing.id };
        await this.db.financeFormulas.put(next);
        return right(next);
      }
      const id = await this.db.financeFormulas.add(data);
      return right({ ...data, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async deleteFormula(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeFormulas.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listRecurrences(): Promise<Either<InfrastructureError, Recurrence[]>> {
    try {
      const recurrences = await this.db.financeRecurrences.toArray();
      recurrences.sort((a, b) => a.description.localeCompare(b.description));
      return right(recurrences);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async saveRecurrence(
    data: NewRecurrence | Recurrence,
  ): Promise<Either<InfrastructureError, Recurrence>> {
    try {
      const existing = await this.db.financeRecurrences
        .where('uid')
        .equals(data.uid)
        .first();
      if (existing?.id) {
        const next = { ...data, id: existing.id };
        await this.db.financeRecurrences.put(next);
        return right(next);
      }
      const id = await this.db.financeRecurrences.add(data);
      return right({ ...data, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async deleteRecurrence(
    uid: string,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeRecurrences.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listPlans(): Promise<Either<InfrastructureError, InstallmentPlan[]>> {
    try {
      const plans = await this.db.financeInstallmentPlans.toArray();
      plans.sort((a, b) => b.createdAt - a.createdAt);
      return right(plans);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async createPlan(
    plan: NewInstallmentPlan,
  ): Promise<Either<InfrastructureError, InstallmentPlan>> {
    try {
      const id = await this.db.financeInstallmentPlans.add(plan);
      return right({ ...plan, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async deletePlan(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeInstallmentPlans.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async countCategoryRefs(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const formulaCount = await this.db.financeFormulas
        .filter(
          (formula) =>
            formula.outputCategoryUid === categoryUid ||
            formula.filter.categoryUids.includes(categoryUid),
        )
        .count();
      const recurrenceCount = await this.db.financeRecurrences
        .filter((recurrence) => recurrence.categoryUid === categoryUid)
        .count();
      const planCount = await this.db.financeInstallmentPlans
        .filter((plan) => plan.categoryUid === categoryUid)
        .count();
      return right(formulaCount + recurrenceCount + planCount);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async countMemberRefs(
    memberUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const formulaCount = await this.db.financeFormulas
        .filter((formula) => formula.filter.memberUids.includes(memberUid))
        .count();
      const recurrenceCount = await this.db.financeRecurrences
        .filter((recurrence) => recurrence.memberUids.includes(memberUid))
        .count();
      const planCount = await this.db.financeInstallmentPlans
        .filter((plan) => plan.memberUids.includes(memberUid))
        .count();
      return right(formulaCount + recurrenceCount + planCount);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
