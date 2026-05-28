import { DexieUnitOfWork } from '../infrastructure/dexie/dexie-unit-of-work';
import { getDatabase } from '../infrastructure/dexie/provider-registry';
import { DexieProductRepository } from '../infrastructure/dexie/repositories/dexie-product.repository';
import { DexieCustomizationRepository } from '../infrastructure/dexie/repositories/dexie-customization.repository';
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

export function createContainer() {
  const db = getDatabase();
  const uow = new DexieUnitOfWork(db);
  const products = new DexieProductRepository(db);
  const customizations = new DexieCustomizationRepository(db);

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
  };
}

export type Container = ReturnType<typeof createContainer>;
export type { FinalizeOrderInput };

export const container = createContainer();
