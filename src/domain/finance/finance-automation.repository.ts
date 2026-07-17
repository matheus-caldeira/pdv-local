import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type {
  FinanceFormula,
  InstallmentPlan,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewRecurrence,
  Recurrence,
} from './finance.entity';

export interface FinanceAutomationRepository {
  listFormulas(): Promise<Either<InfrastructureError, FinanceFormula[]>>;
  saveFormula(
    data: NewFinanceFormula | FinanceFormula,
  ): Promise<Either<InfrastructureError, FinanceFormula>>;
  deleteFormula(uid: string): Promise<Either<InfrastructureError, void>>;
  listRecurrences(): Promise<Either<InfrastructureError, Recurrence[]>>;
  saveRecurrence(
    data: NewRecurrence | Recurrence,
  ): Promise<Either<InfrastructureError, Recurrence>>;
  deleteRecurrence(uid: string): Promise<Either<InfrastructureError, void>>;
  listPlans(): Promise<Either<InfrastructureError, InstallmentPlan[]>>;
  createPlan(
    plan: NewInstallmentPlan,
  ): Promise<Either<InfrastructureError, InstallmentPlan>>;
  deletePlan(uid: string): Promise<Either<InfrastructureError, void>>;
  countCategoryRefs(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>>;
  countMemberRefs(
    memberUid: string,
  ): Promise<Either<InfrastructureError, number>>;
}
