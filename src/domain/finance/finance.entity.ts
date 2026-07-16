export type FinanceKind = 'income' | 'expense';
export type EntryStatus = 'pending' | 'paid';
export type EntrySource = 'manual' | 'installment' | 'recurrence' | 'formula';
export type MonthKey = string;

export interface FamilyMember {
  id?: number;
  uid: string;
  name: string;
  archived: boolean;
  createdAt: number;
}

export type NewFamilyMember = Omit<FamilyMember, 'id'>;

export interface FinanceCategory {
  id?: number;
  uid: string;
  name: string;
  kind: FinanceKind;
  archived: boolean;
  createdAt: number;
}

export type NewFinanceCategory = Omit<FinanceCategory, 'id'>;

export interface FinanceEntry {
  id?: number;
  uid: string;
  description: string;
  amount: number;
  kind: FinanceKind;
  categoryUid: string;
  memberUids: string[];
  date: number;
  month: MonthKey;
  status: EntryStatus;
  source: EntrySource;
  sourceUid: string | null;
  installmentNumber: number | null;
  sourceEntryUids: string[];
  formulaBaseMonth: MonthKey | null;
  createdAt: number;
  updatedAt: number;
}

export type NewFinanceEntry = Omit<FinanceEntry, 'id'>;

export interface BudgetItem {
  id?: number;
  uid: string;
  categoryUid: string;
  amount: number;
  month: MonthKey | null;
  createdAt: number;
  updatedAt: number;
}

export type NewBudgetItem = Omit<BudgetItem, 'id'>;

export interface FormulaFilter {
  kind: FinanceKind;
  categoryUids: string[];
  memberUids: string[];
}

export interface FinanceFormula {
  id?: number;
  uid: string;
  name: string;
  percent: number;
  filter: FormulaFilter;
  outputKind: FinanceKind;
  outputCategoryUid: string;
  outputDescription: string;
  createdAt: number;
  updatedAt: number;
}

export type NewFinanceFormula = Omit<FinanceFormula, 'id'>;

export interface Recurrence {
  id?: number;
  uid: string;
  description: string;
  amount: number;
  kind: FinanceKind;
  categoryUid: string;
  memberUids: string[];
  dayOfMonth: number;
  startMonth: MonthKey;
  endMonth: MonthKey | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewRecurrence = Omit<Recurrence, 'id'>;

export interface InstallmentPlan {
  id?: number;
  uid: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  firstMonth: MonthKey;
  dayOfMonth: number;
  kind: FinanceKind;
  categoryUid: string;
  memberUids: string[];
  createdAt: number;
}

export type NewInstallmentPlan = Omit<InstallmentPlan, 'id'>;

export interface ClosingCategoryLine {
  categoryUid: string;
  name: string;
  kind: FinanceKind;
  budgeted: number;
  actual: number;
}

export interface MonthClosing {
  id?: number;
  uid: string;
  month: MonthKey;
  closedAt: number;
  plannedIncome: number;
  plannedExpense: number;
  plannedBalance: number;
  actualIncome: number;
  actualExpense: number;
  actualBalance: number;
  categories: ClosingCategoryLine[];
}

export type NewMonthClosing = Omit<MonthClosing, 'id'>;
