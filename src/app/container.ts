import { DexieUnitOfWork } from '../infrastructure/dexie/dexie-unit-of-work';
import { getDatabase } from '../infrastructure/dexie/provider-registry';
import { DexieProductRepository } from '../infrastructure/dexie/repositories/dexie-product.repository';
import { DexieCustomizationRepository } from '../infrastructure/dexie/repositories/dexie-customization.repository';
import { DexieCustomerRepository } from '../infrastructure/dexie/repositories/dexie-customer.repository';
import { DexieCashRepository } from '../infrastructure/dexie/repositories/dexie-cash.repository';
import { DexieOrderRepository } from '../infrastructure/dexie/repositories/dexie-order.repository';
import { DexieConfigRepository } from '../infrastructure/dexie/repositories/dexie-config.repository';
import { DexieBackupRepository } from '../infrastructure/dexie/repositories/dexie-backup.repository';
import { browserFileSaver } from '../infrastructure/dexie/browser-file-saver';
import {
  makeFinalizeOrder,
  type FinalizeOrderInput,
} from '../application/order/finalize-order.usecase';
import {
  makeCreateProduct,
  makeListProducts,
  makeRemoveProduct,
  makeUpdateProduct,
} from '../application/product/product.usecases';
import {
  makeCreateGroup,
  makeCreateItem,
  makeListGroups,
  makeListItems,
  makeRemoveGroup,
  makeRemoveItem,
  makeUpdateGroup,
  makeUpdateItem,
} from '../application/customization/customization.usecases';
import {
  makeListCustomers,
  makeRemoveCustomer,
  makeSaveCustomer,
} from '../application/customer/customer.usecases';
import {
  makeAddCashMovement,
  makeCloseSession,
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

  return {
    finalizeOrder: makeFinalizeOrder(uow),
    listProducts: makeListProducts(products),
    createProduct: makeCreateProduct(products),
    updateProduct: makeUpdateProduct(products),
    removeProduct: makeRemoveProduct(products),
    listGroups: makeListGroups(customizations),
    listItems: makeListItems(customizations),
    createGroup: makeCreateGroup(customizations),
    updateGroup: makeUpdateGroup(customizations),
    removeGroup: makeRemoveGroup(uow),
    createItem: makeCreateItem(customizations),
    updateItem: makeUpdateItem(customizations),
    removeItem: makeRemoveItem(customizations),
    listCustomers: makeListCustomers(customers),
    saveCustomer: makeSaveCustomer(customers),
    removeCustomer: makeRemoveCustomer(customers),
    loadCashSummary: makeLoadCashSummary(cash, orders),
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
  };
}

export type Container = ReturnType<typeof createContainer>;
export type { FinalizeOrderInput };

export const container = createContainer();
