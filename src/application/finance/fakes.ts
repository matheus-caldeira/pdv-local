import type {
  BudgetItem,
  EntryStatus,
  FamilyMember,
  FinanceCategory,
  FinanceEntry,
  FinanceFormula,
  FinanceKind,
  InstallmentPlan,
  MonthClosing,
  MonthKey,
  NewFinanceEntry,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewMonthClosing,
  NewRecurrence,
  Recurrence,
} from '../../domain/finance/finance.entity';
import type { FinanceMemberRepository } from '../../domain/finance/finance-member.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type {
  FinanceEntryFilter,
  FinanceEntryRepository,
} from '../../domain/finance/finance-entry.repository';
import type { FinanceBudgetRepository } from '../../domain/finance/finance-budget.repository';
import type { FinanceAutomationRepository } from '../../domain/finance/finance-automation.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import type { PaymentMethodRepository } from '../../domain/finance/payment-method.repository';
import type { CardInvoiceRepository } from '../../domain/finance/card-invoice.repository';
import type {
  CardInvoice,
  NewCardInvoice,
  NewPaymentMethod,
  PaymentMethod,
} from '../../domain/finance/payment-method.entity';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import type { Repositories } from '../../domain/shared/repositories';
import type { AppError } from '../../domain/shared/errors';
import { isLeft, left, right, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import {
  RecordNotFoundError,
  UniqueConstraintError,
  type InfrastructureError,
} from '../../infrastructure/errors';

export abstract class FakeFinanceRepository {
  private nextFailure: InfrastructureError | null = null;

  failNext(error: InfrastructureError): void {
    this.nextFailure = error;
  }

  protected takeFailure(): InfrastructureError | null {
    const failure = this.nextFailure;
    this.nextFailure = null;
    return failure;
  }

  abstract snapshot(): () => void;
}

export class FakeFinanceMemberRepository
  extends FakeFinanceRepository
  implements FinanceMemberRepository
{
  private items: FamilyMember[] = [];
  private nextId = 1;
  private clock = 0;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async list(): Promise<Either<InfrastructureError, FamilyMember[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.items]);
  }

  async create(
    name: string,
  ): Promise<Either<InfrastructureError, FamilyMember>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.insert(name));
  }

  async update(
    uid: string,
    changes: Partial<Pick<FamilyMember, 'name' | 'archived'>>,
  ): Promise<Either<InfrastructureError, FamilyMember>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.items.findIndex((member) => member.uid === uid);
    if (index < 0) {
      return left(new RecordNotFoundError('Membro não encontrado.'));
    }
    const updated = { ...this.items[index], ...changes };
    this.items[index] = updated;
    return right(updated);
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.items = this.items.filter((member) => member.uid !== uid);
    return right(undefined);
  }

  async ensureDefault(
    name: string,
  ): Promise<Either<InfrastructureError, FamilyMember | null>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    if (this.items.length > 0) return right(null);
    return right(this.insert(name));
  }

  private insert(name: string): FamilyMember {
    this.clock += 1;
    const member: FamilyMember = {
      id: this.nextId,
      uid: createUid(),
      name,
      archived: false,
      createdAt: this.clock,
    };
    this.nextId += 1;
    this.items.push(member);
    return member;
  }
}

export class FakeFinanceCategoryRepository
  extends FakeFinanceRepository
  implements FinanceCategoryRepository
{
  private items: FinanceCategory[] = [];
  private nextId = 1;
  private clock = 0;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async list(): Promise<Either<InfrastructureError, FinanceCategory[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.items]);
  }

  async create(data: {
    name: string;
    kind: FinanceKind;
  }): Promise<Either<InfrastructureError, FinanceCategory>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.insert(data));
  }

  async update(
    uid: string,
    changes: Partial<Pick<FinanceCategory, 'name' | 'archived'>>,
  ): Promise<Either<InfrastructureError, FinanceCategory>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.items.findIndex((category) => category.uid === uid);
    if (index < 0) {
      return left(new RecordNotFoundError('Categoria não encontrada.'));
    }
    const updated = { ...this.items[index], ...changes };
    this.items[index] = updated;
    return right(updated);
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.items = this.items.filter((category) => category.uid !== uid);
    return right(undefined);
  }

  async ensureDefaults(
    defaults: { name: string; kind: FinanceKind }[],
  ): Promise<Either<InfrastructureError, FinanceCategory[] | null>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    if (this.items.length > 0) return right(null);
    return right(defaults.map((data) => this.insert(data)));
  }

  private insert(data: { name: string; kind: FinanceKind }): FinanceCategory {
    this.clock += 1;
    const category: FinanceCategory = {
      id: this.nextId,
      uid: createUid(),
      name: data.name,
      kind: data.kind,
      archived: false,
      createdAt: this.clock,
    };
    this.nextId += 1;
    this.items.push(category);
    return category;
  }
}

const matchesEntryFilter = (
  entry: FinanceEntry,
  filter: FinanceEntryFilter,
): boolean =>
  (filter.month === undefined || entry.month === filter.month) &&
  (filter.status === undefined || entry.status === filter.status) &&
  (filter.kind === undefined || entry.kind === filter.kind) &&
  (filter.categoryUid === undefined ||
    entry.categoryUid === filter.categoryUid) &&
  (filter.memberUid === undefined ||
    entry.memberUids.includes(filter.memberUid)) &&
  (filter.text === undefined ||
    entry.description.toLowerCase().includes(filter.text.toLowerCase())) &&
  (filter.sourceUid === undefined || entry.sourceUid === filter.sourceUid) &&
  (filter.source === undefined || entry.source === filter.source) &&
  (filter.monthBefore === undefined || entry.month < filter.monthBefore) &&
  (filter.paymentMethodUid === undefined ||
    entry.paymentMethodUid === filter.paymentMethodUid) &&
  (filter.invoiceMonth === undefined ||
    entry.invoiceMonth === filter.invoiceMonth) &&
  (filter.invoiceUid === undefined || entry.invoiceUid === filter.invoiceUid);

const byEntryOrder = (a: FinanceEntry, b: FinanceEntry): number =>
  a.date - b.date || a.createdAt - b.createdAt || a.uid.localeCompare(b.uid);

export class FakeFinanceEntryRepository
  extends FakeFinanceRepository
  implements FinanceEntryRepository
{
  private items: FinanceEntry[] = [];
  private nextId = 1;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async list(
    filter: FinanceEntryFilter,
  ): Promise<Either<InfrastructureError, FinanceEntry[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items
        .filter((entry) => matchesEntryFilter(entry, filter))
        .sort(byEntryOrder),
    );
  }

  async findByUid(
    uid: string,
  ): Promise<Either<InfrastructureError, FinanceEntry | undefined>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.items.find((entry) => entry.uid === uid));
  }

  async create(
    entry: NewFinanceEntry,
  ): Promise<Either<InfrastructureError, FinanceEntry>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.insert(entry));
  }

  async createMany(
    entries: NewFinanceEntry[],
  ): Promise<Either<InfrastructureError, FinanceEntry[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(entries.map((entry) => this.insert(entry)));
  }

  async update(
    uid: string,
    changes: Partial<Omit<FinanceEntry, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, FinanceEntry>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.items.findIndex((entry) => entry.uid === uid);
    if (index < 0) {
      return left(new RecordNotFoundError('Lançamento não encontrado.'));
    }
    const updated = { ...this.items[index], ...changes };
    this.items[index] = updated;
    return right(updated);
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.items = this.items.filter((entry) => entry.uid !== uid);
    return right(undefined);
  }

  async deleteBySource(
    sourceUid: string,
    onlyStatus: EntryStatus,
    excludeMonths: MonthKey[],
  ): Promise<Either<InfrastructureError, number>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const remaining = this.items.filter(
      (entry) =>
        !(
          entry.sourceUid === sourceUid &&
          entry.status === onlyStatus &&
          !excludeMonths.includes(entry.month)
        ),
    );
    const removed = this.items.length - remaining.length;
    this.items = remaining;
    return right(removed);
  }

  async listPaid(): Promise<Either<InfrastructureError, FinanceEntry[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items.filter((entry) => entry.status === 'paid').sort(byEntryOrder),
    );
  }

  async countByCategory(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items.filter((entry) => entry.categoryUid === categoryUid).length,
    );
  }

  async countByMember(
    memberUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items.filter((entry) => entry.memberUids.includes(memberUid)).length,
    );
  }

  private insert(entry: NewFinanceEntry): FinanceEntry {
    const created: FinanceEntry = {
      ...entry,
      id: this.nextId,
      memberUids: [...entry.memberUids],
      sourceEntryUids: [...entry.sourceEntryUids],
    };
    this.nextId += 1;
    this.items.push(created);
    return created;
  }
}

export class FakeFinanceBudgetRepository
  extends FakeFinanceRepository
  implements FinanceBudgetRepository
{
  private items: BudgetItem[] = [];
  private nextId = 1;
  private clock = 0;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async listAll(): Promise<Either<InfrastructureError, BudgetItem[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.items]);
  }

  async save(item: {
    categoryUid: string;
    month: MonthKey | null;
    amount: number;
  }): Promise<Either<InfrastructureError, BudgetItem>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.clock += 1;
    const index = this.items.findIndex(
      (existing) =>
        existing.categoryUid === item.categoryUid &&
        existing.month === item.month,
    );
    if (index >= 0) {
      const updated = {
        ...this.items[index],
        amount: item.amount,
        updatedAt: this.clock,
      };
      this.items[index] = updated;
      return right(updated);
    }
    const created: BudgetItem = {
      id: this.nextId,
      uid: createUid(),
      categoryUid: item.categoryUid,
      month: item.month,
      amount: item.amount,
      createdAt: this.clock,
      updatedAt: this.clock,
    };
    this.nextId += 1;
    this.items.push(created);
    return right(created);
  }

  async remove(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.items = this.items.filter((item) => item.uid !== uid);
    return right(undefined);
  }

  async countByCategory(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items.filter((item) => item.categoryUid === categoryUid).length,
    );
  }
}

export class FakeFinanceAutomationRepository
  extends FakeFinanceRepository
  implements FinanceAutomationRepository
{
  private formulas: FinanceFormula[] = [];
  private recurrences: Recurrence[] = [];
  private plans: InstallmentPlan[] = [];
  private nextFormulaId = 1;
  private nextRecurrenceId = 1;
  private nextPlanId = 1;

  snapshot(): () => void {
    const formulas = [...this.formulas];
    const recurrences = [...this.recurrences];
    const plans = [...this.plans];
    return () => {
      this.formulas = [...formulas];
      this.recurrences = [...recurrences];
      this.plans = [...plans];
    };
  }

  async listFormulas(): Promise<Either<InfrastructureError, FinanceFormula[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.formulas]);
  }

  async saveFormula(
    data: NewFinanceFormula | FinanceFormula,
  ): Promise<Either<InfrastructureError, FinanceFormula>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.formulas.findIndex(
      (formula) => formula.uid === data.uid,
    );
    if (index >= 0) {
      const updated = { ...data, id: this.formulas[index].id };
      this.formulas[index] = updated;
      return right(updated);
    }
    const created = { ...data, id: this.nextFormulaId };
    this.nextFormulaId += 1;
    this.formulas.push(created);
    return right(created);
  }

  async deleteFormula(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.formulas = this.formulas.filter((formula) => formula.uid !== uid);
    return right(undefined);
  }

  async listRecurrences(): Promise<Either<InfrastructureError, Recurrence[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.recurrences]);
  }

  async saveRecurrence(
    data: NewRecurrence | Recurrence,
  ): Promise<Either<InfrastructureError, Recurrence>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.recurrences.findIndex(
      (recurrence) => recurrence.uid === data.uid,
    );
    if (index >= 0) {
      const updated = { ...data, id: this.recurrences[index].id };
      this.recurrences[index] = updated;
      return right(updated);
    }
    const created = { ...data, id: this.nextRecurrenceId };
    this.nextRecurrenceId += 1;
    this.recurrences.push(created);
    return right(created);
  }

  async deleteRecurrence(
    uid: string,
  ): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.recurrences = this.recurrences.filter(
      (recurrence) => recurrence.uid !== uid,
    );
    return right(undefined);
  }

  async listPlans(): Promise<Either<InfrastructureError, InstallmentPlan[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.plans]);
  }

  async createPlan(
    plan: NewInstallmentPlan,
  ): Promise<Either<InfrastructureError, InstallmentPlan>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const created: InstallmentPlan = {
      ...plan,
      id: this.nextPlanId,
      memberUids: [...plan.memberUids],
    };
    this.nextPlanId += 1;
    this.plans.push(created);
    return right(created);
  }

  async deletePlan(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.plans = this.plans.filter((plan) => plan.uid !== uid);
    return right(undefined);
  }

  async countCategoryRefs(
    categoryUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const formulaRefs = this.formulas.filter(
      (formula) =>
        formula.outputCategoryUid === categoryUid ||
        formula.filter.categoryUids.includes(categoryUid),
    ).length;
    const recurrenceRefs = this.recurrences.filter(
      (recurrence) => recurrence.categoryUid === categoryUid,
    ).length;
    const planRefs = this.plans.filter(
      (plan) => plan.categoryUid === categoryUid,
    ).length;
    return right(formulaRefs + recurrenceRefs + planRefs);
  }

  async countMemberRefs(
    memberUid: string,
  ): Promise<Either<InfrastructureError, number>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const formulaRefs = this.formulas.filter((formula) =>
      formula.filter.memberUids.includes(memberUid),
    ).length;
    const recurrenceRefs = this.recurrences.filter((recurrence) =>
      recurrence.memberUids.includes(memberUid),
    ).length;
    const planRefs = this.plans.filter((plan) =>
      plan.memberUids.includes(memberUid),
    ).length;
    return right(formulaRefs + recurrenceRefs + planRefs);
  }
}

export class FakeFinanceClosingRepository
  extends FakeFinanceRepository
  implements FinanceClosingRepository
{
  private items: MonthClosing[] = [];
  private nextId = 1;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async list(): Promise<Either<InfrastructureError, MonthClosing[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      [...this.items].sort((a, b) => a.month.localeCompare(b.month)),
    );
  }

  async findByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, MonthClosing | undefined>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.items.find((closing) => closing.month === month));
  }

  async listClosedMonths(): Promise<Either<InfrastructureError, MonthKey[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items
        .map((closing) => closing.month)
        .sort((a, b) => a.localeCompare(b)),
    );
  }

  async create(
    closing: NewMonthClosing,
  ): Promise<Either<InfrastructureError, MonthClosing>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    if (this.items.some((existing) => existing.month === closing.month)) {
      return left(
        new UniqueConstraintError(
          `Já existe um fechamento para o mês ${closing.month}.`,
        ),
      );
    }
    const created: MonthClosing = {
      ...closing,
      id: this.nextId,
      categories: [...closing.categories],
    };
    this.nextId += 1;
    this.items.push(created);
    return right(created);
  }

  async deleteByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.items = this.items.filter((closing) => closing.month !== month);
    return right(undefined);
  }
}

export class FakePaymentMethodRepository
  extends FakeFinanceRepository
  implements PaymentMethodRepository
{
  private items: PaymentMethod[] = [];
  private nextId = 1;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async list(): Promise<Either<InfrastructureError, PaymentMethod[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right([...this.items]);
  }

  async findByUid(
    uid: string,
  ): Promise<Either<InfrastructureError, PaymentMethod | undefined>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.items.find((method) => method.uid === uid));
  }

  async create(
    method: NewPaymentMethod,
  ): Promise<Either<InfrastructureError, PaymentMethod>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const created: PaymentMethod = { ...method, id: this.nextId };
    this.nextId += 1;
    this.items.push(created);
    return right(created);
  }

  async update(
    uid: string,
    changes: Partial<Omit<PaymentMethod, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, PaymentMethod>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.items.findIndex((method) => method.uid === uid);
    if (index < 0) {
      return left(new RecordNotFoundError('Meio de pagamento não encontrado.'));
    }
    const updated = { ...this.items[index], ...changes };
    this.items[index] = updated;
    return right(updated);
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    this.items = this.items.filter((method) => method.uid !== uid);
    return right(undefined);
  }
}

export class FakeCardInvoiceRepository
  extends FakeFinanceRepository
  implements CardInvoiceRepository
{
  private items: CardInvoice[] = [];
  private nextId = 1;

  snapshot(): () => void {
    const items = [...this.items];
    return () => {
      this.items = [...items];
    };
  }

  async findByCardAndMonth(
    paymentMethodUid: string,
    month: MonthKey,
  ): Promise<Either<InfrastructureError, CardInvoice | undefined>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items.find(
        (invoice) =>
          invoice.paymentMethodUid === paymentMethodUid &&
          invoice.month === month,
      ),
    );
  }

  async listByCard(
    paymentMethodUid: string,
  ): Promise<Either<InfrastructureError, CardInvoice[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(
      this.items
        .filter((invoice) => invoice.paymentMethodUid === paymentMethodUid)
        .sort((a, b) => a.month.localeCompare(b.month)),
    );
  }

  async listByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, CardInvoice[]>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    return right(this.items.filter((invoice) => invoice.month === month));
  }

  async create(
    invoice: NewCardInvoice,
  ): Promise<Either<InfrastructureError, CardInvoice>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const created: CardInvoice = { ...invoice, id: this.nextId };
    this.nextId += 1;
    this.items.push(created);
    return right(created);
  }

  async update(
    uid: string,
    changes: Partial<Omit<CardInvoice, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, CardInvoice>> {
    const failure = this.takeFailure();
    if (failure) return left(failure);
    const index = this.items.findIndex((invoice) => invoice.uid === uid);
    if (index < 0) {
      return left(new RecordNotFoundError('Fatura não encontrada.'));
    }
    const updated = { ...this.items[index], ...changes };
    this.items[index] = updated;
    return right(updated);
  }
}

export const makeFakeUnitOfWork = (
  repos: Record<string, FakeFinanceRepository>,
): UnitOfWork => ({
  async run<A>(
    work: (repositories: Repositories) => Promise<Either<AppError, A>>,
  ): Promise<Either<AppError, A>> {
    const restorers = Object.values(repos).map((repo) => repo.snapshot());
    const result = await work(repos as unknown as Repositories);
    if (isLeft(result)) {
      restorers.forEach((restore) => restore());
    }
    return result;
  },
});
