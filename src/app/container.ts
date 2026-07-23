import { DexieUnitOfWork } from '../infrastructure/dexie/dexie-unit-of-work';
import { getDatabase } from '../infrastructure/dexie/provider-registry';
import { DexieProductRepository } from '../infrastructure/dexie/repositories/dexie-product.repository';
import { DexieCustomizationRepository } from '../infrastructure/dexie/repositories/dexie-customization.repository';
import { DexieCustomerRepository } from '../infrastructure/dexie/repositories/dexie-customer.repository';
import { DexieCashRepository } from '../infrastructure/dexie/repositories/dexie-cash.repository';
import { DexieOrderRepository } from '../infrastructure/dexie/repositories/dexie-order.repository';
import { DexieConfigRepository } from '../infrastructure/dexie/repositories/dexie-config.repository';
import { DexieBackupRepository } from '../infrastructure/dexie/repositories/dexie-backup.repository';
import { DexieFinanceMemberRepository } from '../infrastructure/dexie/repositories/dexie-finance-member.repository';
import { DexieFinanceCategoryRepository } from '../infrastructure/dexie/repositories/dexie-finance-category.repository';
import { DexieFinanceEntryRepository } from '../infrastructure/dexie/repositories/dexie-finance-entry.repository';
import { DexieFinanceBudgetRepository } from '../infrastructure/dexie/repositories/dexie-finance-budget.repository';
import { DexieFinanceAutomationRepository } from '../infrastructure/dexie/repositories/dexie-finance-automation.repository';
import { DexieFinanceClosingRepository } from '../infrastructure/dexie/repositories/dexie-finance-closing.repository';
import { DexiePaymentMethodRepository } from '../infrastructure/dexie/repositories/dexie-payment-method.repository';
import { DexieCardInvoiceRepository } from '../infrastructure/dexie/repositories/dexie-card-invoice.repository';
import { browserFileSaver } from '../infrastructure/dexie/browser-file-saver';
import {
  makeCreateProduct,
  makeListActiveProducts,
  makeListProducts,
  makeRemoveProduct,
  makeUpdateProduct,
} from '../application/product/product.usecases';
import {
  makeCreateGroup,
  makeCreateItem,
  makeListGroups,
  makeListItems,
  makeLoadProductCustomizations,
  makeRemoveGroup,
  makeRemoveItem,
  makeUpdateGroup,
  makeUpdateItem,
} from '../application/customization/customization.usecases';
import {
  makeListCustomers,
  makeRemoveCustomer,
  makeSaveCustomer,
  makeSearchCustomersByPhone,
} from '../application/customer/customer.usecases';
import {
  makeAddCashMovement,
  makeCloseSession,
  makeGetActiveSession,
  makeLoadCashSummary,
  makeOpenSession,
} from '../application/cash/cash.usecases';
import {
  makeCancelOrder,
  makeListOrders,
  makeMarkOrderPaid,
  makeObserveActiveOrders,
  makeObserveSessionOrders,
  makeSetOrderStage,
} from '../application/order/order-management.usecases';
import {
  makePeekTicketSuggestion,
  makeReadConfig,
  makeResetTicketSequence,
  makeSaveConfig,
} from '../application/config/config.usecases';
import {
  makeListReportSessions,
  makeLoadDashboard,
  makeLoadSessionReport,
} from '../application/report/report.usecases';
import {
  makeExportBackup,
  makeExportEntity,
  makeHasData,
  makeImportBackup,
  makeLoadDemo,
  makeWipeData,
} from '../application/backup/backup.usecases';
import {
  makeCreateMember,
  makeDeleteMember,
  makeEnsureFinanceDefaults,
  makeListMembers,
  makeUpdateMember,
} from '../application/finance/members.usecases';
import {
  makeCreateCategory,
  makeDeleteCategory,
  makeListCategories,
  makeUpdateCategory,
} from '../application/finance/categories.usecases';
import {
  makeCreateEntry,
  makeDeleteEntry,
  makeListEntries,
  makeListOverdueEntries,
  makeSetEntryStatus,
  makeUpdateEntry,
} from '../application/finance/entries.usecases';
import {
  makeLoadBudget,
  makeRemoveBudgetItem,
  makeSaveMonthOverride,
  makeSaveTemplateItem,
} from '../application/finance/budget.usecases';
import {
  makeCloseMonth,
  makeListClosings,
  makeLoadClosingPreview,
  makeReopenMonth,
} from '../application/finance/closing.usecases';
import { makeLoadProjection } from '../application/finance/projection.usecases';
import { makeLoadFinanceDashboard } from '../application/finance/dashboard.usecases';
import {
  makeCreateInstallmentPlan,
  makeDeleteFormula,
  makeDeleteInstallmentPlan,
  makeDeleteRecurrence,
  makeGenerateFormulaEntry,
  makeLaunchAllRecurrences,
  makeLaunchRecurrence,
  makeListFormulas,
  makeListPlans,
  makeListRecurrences,
  makePreviewFormula,
  makePreviewInstallments,
  makeSaveFormula,
  makeSaveRecurrence,
} from '../application/finance/automations.usecases';
import { makeResolveActiveType } from '../application/business-type/resolve-active-type.usecase';
import {
  makeCompleteFirstRun,
  makeResolveModulesState,
  makeSaveEnabledModules,
} from '../application/modules/modules.usecases';
import { resolveRegisterOrder } from '../application/use-case-registry';
import type { BusinessTypeDefinition } from '../domain/business-type/registry';
import type { RegisterOrderInput } from '../application/order/register-order.usecase';

export function createContainer() {
  const db = getDatabase();
  const uow = new DexieUnitOfWork(db);
  const products = new DexieProductRepository(db);
  const customizations = new DexieCustomizationRepository(db);
  const customers = new DexieCustomerRepository(db);
  const cash = new DexieCashRepository(db);
  const orders = new DexieOrderRepository(db);
  const config = new DexieConfigRepository(db);
  const backup = new DexieBackupRepository(db, browserFileSaver);
  const financeMembers = new DexieFinanceMemberRepository(db);
  const financeCategories = new DexieFinanceCategoryRepository(db);
  const financeEntries = new DexieFinanceEntryRepository(db);
  const financeBudget = new DexieFinanceBudgetRepository(db);
  const financeAutomations = new DexieFinanceAutomationRepository(db);
  const financeClosings = new DexieFinanceClosingRepository(db);
  const financePaymentMethods = new DexiePaymentMethodRepository(db);
  const financeCardInvoices = new DexieCardInvoiceRepository(db);

  return {
    listProducts: makeListProducts(products),
    listActiveProducts: makeListActiveProducts(products),
    createProduct: makeCreateProduct(products),
    updateProduct: makeUpdateProduct(products),
    removeProduct: makeRemoveProduct(products),
    listGroups: makeListGroups(customizations),
    listItems: makeListItems(customizations),
    loadProductCustomizations: makeLoadProductCustomizations(customizations),
    createGroup: makeCreateGroup(customizations),
    updateGroup: makeUpdateGroup(customizations),
    removeGroup: makeRemoveGroup(uow),
    createItem: makeCreateItem(customizations),
    updateItem: makeUpdateItem(customizations),
    removeItem: makeRemoveItem(customizations),
    listCustomers: makeListCustomers(customers),
    searchCustomersByPhone: makeSearchCustomersByPhone(customers),
    saveCustomer: makeSaveCustomer(customers),
    removeCustomer: makeRemoveCustomer(customers),
    loadCashSummary: makeLoadCashSummary(cash, orders),
    getActiveSession: makeGetActiveSession(cash),
    openSession: makeOpenSession(cash),
    closeSession: makeCloseSession(cash),
    addCashMovement: makeAddCashMovement(cash),
    listOrders: makeListOrders(orders),
    observeSessionOrders: makeObserveSessionOrders(orders),
    observeActiveOrders: makeObserveActiveOrders(orders),
    markOrderPaid: makeMarkOrderPaid(orders),
    cancelOrder: makeCancelOrder(orders),
    setOrderStage: makeSetOrderStage(orders),
    readConfig: makeReadConfig(config),
    peekTicketSuggestion: makePeekTicketSuggestion(config),
    saveConfig: makeSaveConfig(config),
    resetTicketSequence: makeResetTicketSequence(config),
    listReportSessions: makeListReportSessions(cash),
    loadSessionReport: makeLoadSessionReport(orders),
    loadDashboard: makeLoadDashboard(orders),
    exportBackup: makeExportBackup(backup),
    exportEntity: makeExportEntity(backup),
    importBackup: makeImportBackup(backup),
    hasData: makeHasData(backup),
    loadDemo: makeLoadDemo(backup),
    wipeData: makeWipeData(backup),
    listFinanceMembers: makeListMembers(financeMembers),
    createFinanceMember: makeCreateMember(financeMembers),
    updateFinanceMember: makeUpdateMember(financeMembers),
    deleteFinanceMember: makeDeleteMember(
      financeMembers,
      financeEntries,
      financeAutomations,
    ),
    ensureFinanceDefaults: makeEnsureFinanceDefaults(
      financeMembers,
      financeCategories,
    ),
    listFinanceCategories: makeListCategories(financeCategories),
    createFinanceCategory: makeCreateCategory(financeCategories),
    updateFinanceCategory: makeUpdateCategory(financeCategories),
    deleteFinanceCategory: makeDeleteCategory(
      financeCategories,
      financeEntries,
      financeBudget,
      financeAutomations,
    ),
    listFinanceEntries: makeListEntries(financeEntries),
    listOverdueFinanceEntries: makeListOverdueEntries(financeEntries),
    createFinanceEntry: makeCreateEntry(
      financeEntries,
      financeCategories,
      financeClosings,
      financePaymentMethods,
      financeCardInvoices,
    ),
    updateFinanceEntry: makeUpdateEntry(
      financeEntries,
      financeCategories,
      financeClosings,
      financePaymentMethods,
      financeCardInvoices,
    ),
    deleteFinanceEntry: makeDeleteEntry(financeEntries, financeClosings),
    setFinanceEntryStatus: makeSetEntryStatus(financeEntries),
    loadFinanceBudget: makeLoadBudget(
      financeBudget,
      financeCategories,
      financeEntries,
    ),
    saveFinanceBudgetTemplateItem: makeSaveTemplateItem(financeBudget),
    saveFinanceBudgetOverride: makeSaveMonthOverride(
      financeBudget,
      financeClosings,
    ),
    removeFinanceBudgetItem: makeRemoveBudgetItem(
      financeBudget,
      financeClosings,
    ),
    loadFinanceClosingPreview: makeLoadClosingPreview(
      financeEntries,
      financeBudget,
      financeCategories,
      financeClosings,
    ),
    closeFinanceMonth: makeCloseMonth(
      financeEntries,
      financeBudget,
      financeCategories,
      financeClosings,
    ),
    reopenFinanceMonth: makeReopenMonth(financeClosings),
    listFinanceClosings: makeListClosings(financeClosings),
    loadFinanceProjection: makeLoadProjection(
      financeEntries,
      financeBudget,
      financeCategories,
      financeAutomations,
      financeClosings,
    ),
    loadFinanceDashboard: makeLoadFinanceDashboard(
      financeEntries,
      financeBudget,
      financeCategories,
      financeMembers,
    ),
    listFinanceFormulas: makeListFormulas(financeAutomations),
    saveFinanceFormula: makeSaveFormula(financeAutomations),
    deleteFinanceFormula: makeDeleteFormula(financeAutomations),
    previewFinanceFormula: makePreviewFormula(
      financeEntries,
      financeAutomations,
      financeClosings,
    ),
    generateFinanceFormulaEntry: makeGenerateFormulaEntry(
      financeEntries,
      financeAutomations,
      financeClosings,
    ),
    listFinanceRecurrences: makeListRecurrences(financeAutomations),
    saveFinanceRecurrence: makeSaveRecurrence(financeAutomations),
    deleteFinanceRecurrence: makeDeleteRecurrence(financeAutomations),
    launchFinanceRecurrence: makeLaunchRecurrence(
      financeEntries,
      financeAutomations,
      financeClosings,
    ),
    launchAllFinanceRecurrences: makeLaunchAllRecurrences(
      financeEntries,
      financeAutomations,
      financeClosings,
    ),
    listFinanceInstallmentPlans: makeListPlans(financeAutomations),
    createFinanceInstallmentPlan: makeCreateInstallmentPlan(uow),
    deleteFinanceInstallmentPlan: makeDeleteInstallmentPlan(uow),
    previewFinanceInstallments: makePreviewInstallments(),
    resolveActiveType: makeResolveActiveType({ configRepo: config }),
    resolveModulesState: makeResolveModulesState({
      configRepo: config,
      orderRepo: orders,
      cashRepo: cash,
    }),
    saveEnabledModules: makeSaveEnabledModules(config),
    completeFirstRun: makeCompleteFirstRun(config),
    registerOrder: (
      businessTypeId: string,
      definition: BusinessTypeDefinition,
      input: RegisterOrderInput,
    ) => resolveRegisterOrder(businessTypeId, uow, definition).run(input),
  };
}

export type Container = ReturnType<typeof createContainer>;

export const container = createContainer();
