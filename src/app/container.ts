import { DexieUnitOfWork } from '../infrastructure/dexie/dexie-unit-of-work';
import { getDatabase } from '../infrastructure/dexie/provider-registry';
import { DexieProductRepository } from '../infrastructure/dexie/repositories/dexie-product.repository';
import { DexieCustomizationRepository } from '../infrastructure/dexie/repositories/dexie-customization.repository';
import { DexieCustomerRepository } from '../infrastructure/dexie/repositories/dexie-customer.repository';
import { DexieCashRepository } from '../infrastructure/dexie/repositories/dexie-cash.repository';
import { DexieOrderRepository } from '../infrastructure/dexie/repositories/dexie-order.repository';
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

export function createContainer() {
  const db = getDatabase();
  const uow = new DexieUnitOfWork(db);
  const products = new DexieProductRepository(db);
  const customizations = new DexieCustomizationRepository(db);
  const customers = new DexieCustomerRepository(db);
  const cash = new DexieCashRepository(db);
  const orders = new DexieOrderRepository(db);

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
  };
}

export type Container = ReturnType<typeof createContainer>;
export type { FinalizeOrderInput };

export const container = createContainer();
