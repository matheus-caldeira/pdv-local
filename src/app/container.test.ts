import { describe, expect, it } from 'vitest';
import { createContainer } from './container';

const financeUseCaseNames = [
  'listFinanceMembers',
  'createFinanceMember',
  'updateFinanceMember',
  'deleteFinanceMember',
  'ensureFinanceDefaults',
  'listFinanceCategories',
  'createFinanceCategory',
  'updateFinanceCategory',
  'deleteFinanceCategory',
  'listPaymentMethods',
  'createPaymentMethod',
  'updatePaymentMethod',
  'archivePaymentMethod',
  'getInvoiceDetail',
  'setInvoiceAmount',
  'payInvoice',
  'listInvoiceHistory',
  'listFinanceEntries',
  'listOverdueFinanceEntries',
  'createFinanceEntry',
  'updateFinanceEntry',
  'deleteFinanceEntry',
  'setFinanceEntryStatus',
  'loadFinanceBudget',
  'saveFinanceBudgetTemplateItem',
  'saveFinanceBudgetOverride',
  'removeFinanceBudgetItem',
  'loadFinanceClosingPreview',
  'closeFinanceMonth',
  'reopenFinanceMonth',
  'listFinanceClosings',
  'loadFinanceProjection',
  'loadFinanceDashboard',
  'listFinanceFormulas',
  'saveFinanceFormula',
  'deleteFinanceFormula',
  'previewFinanceFormula',
  'generateFinanceFormulaEntry',
  'listFinanceRecurrences',
  'saveFinanceRecurrence',
  'deleteFinanceRecurrence',
  'launchFinanceRecurrence',
  'launchAllFinanceRecurrences',
  'listFinanceInstallmentPlans',
  'createFinanceInstallmentPlan',
  'deleteFinanceInstallmentPlan',
  'previewFinanceInstallments',
] as const;

describe('createContainer', () => {
  const container = createContainer();

  it.each(financeUseCaseNames)('registra %s como função', (name) => {
    expect(typeof container[name]).toBe('function');
  });
});
