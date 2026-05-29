import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight } from '../../domain/shared/either';
import type { NewProduct } from '../../domain/product/product.entity';
import { PDVDatabase } from './dexie-database';
import { DexieProductRepository } from './repositories/dexie-product.repository';
import { DexieCustomizationRepository } from './repositories/dexie-customization.repository';

let db: PDVDatabase;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  db = new PDVDatabase();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const newProduct = (over: Partial<NewProduct> = {}): NewProduct => ({
  name: 'P',
  category: 'C',
  costPrice: 1,
  salePrice: 2,
  stock: 5,
  active: true,
  customizationGroupIds: [],
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('DexieProductRepository CRUD', () => {
  it('creates, lists (sorted), updates and removes', async () => {
    const repo = new DexieProductRepository(db);
    await repo.create(newProduct({ name: 'Banana' }));
    await repo.create(newProduct({ name: 'Abacaxi' }));
    const listed = await repo.list();
    expect(isRight(listed)).toBe(true);
    if (isRight(listed)) {
      expect(listed.right.map((p) => p.name)).toEqual(['Abacaxi', 'Banana']);
    }
    const created = await repo.create(newProduct({ name: 'Caju' }));
    if (isRight(created)) {
      await repo.update(created.right.id!, newProduct({ name: 'Caju Doce' }));
      const afterUpdate = await db.products.get(created.right.id!);
      expect(afterUpdate?.name).toBe('Caju Doce');
      await repo.remove(created.right.id!);
      expect(await db.products.get(created.right.id!)).toBeUndefined();
    }
  });

  it('removes a customization group reference from products', async () => {
    const repo = new DexieProductRepository(db);
    const withGroup = await repo.create(
      newProduct({ name: 'Combo', customizationGroupIds: [9, 10] }),
    );
    await repo.create(newProduct({ name: 'Plain' }));
    await repo.removeCustomizationGroup(9);
    if (isRight(withGroup)) {
      const updated = await db.products.get(withGroup.right.id!);
      expect(updated?.customizationGroupIds).toEqual([10]);
    }
  });

  it('returns Left on list when the table fails', async () => {
    const repo = new DexieProductRepository(db);
    db.close();
    expect(isLeft(await repo.list())).toBe(true);
    expect(isLeft(await repo.create(newProduct()))).toBe(true);
    expect(isLeft(await repo.update(1, newProduct()))).toBe(true);
    expect(isLeft(await repo.remove(1))).toBe(true);
    expect(isLeft(await repo.removeCustomizationGroup(1))).toBe(true);
  });
});

describe('DexieCustomizationRepository CRUD', () => {
  const group = {
    name: 'Ponto',
    required: true,
    minQty: 1,
    maxQty: 1,
    chargeAfter: 0,
  };
  const item = {
    groupId: 1,
    name: 'Bem passado',
    price: 0,
    maxQty: 1,
    chargeAfter: 0,
    active: true,
  };

  it('manages groups and items, removing items with the group', async () => {
    const repo = new DexieCustomizationRepository(db);
    const created = await repo.createGroup(group);
    expect(isRight(created)).toBe(true);
    const gid = isRight(created) ? created.right.id! : 0;
    await repo.updateGroup(gid, { ...group, name: 'Ponto da carne' });
    expect((await db.customizationGroups.get(gid))?.name).toBe(
      'Ponto da carne',
    );

    const createdItem = await repo.createItem({ ...item, groupId: gid });
    const iid = isRight(createdItem) ? createdItem.right.id! : 0;
    await repo.updateItem(iid, { ...item, groupId: gid, name: 'Mal passado' });
    expect((await db.customizationItems.get(iid))?.name).toBe('Mal passado');

    const groups = await repo.listGroups();
    const items = await repo.listItems();
    expect(isRight(groups) && groups.right.length).toBe(1);
    expect(isRight(items) && items.right.length).toBe(1);

    await repo.removeGroup(gid);
    expect(await db.customizationGroups.count()).toBe(0);
    expect(await db.customizationItems.count()).toBe(0);
  });

  it('removes a single item', async () => {
    const repo = new DexieCustomizationRepository(db);
    const createdItem = await repo.createItem(item);
    const iid = isRight(createdItem) ? createdItem.right.id! : 0;
    await repo.removeItem(iid);
    expect(await db.customizationItems.count()).toBe(0);
  });

  it('returns Left when the table fails', async () => {
    const repo = new DexieCustomizationRepository(db);
    db.close();
    expect(isLeft(await repo.listGroups())).toBe(true);
    expect(isLeft(await repo.listItems())).toBe(true);
    expect(isLeft(await repo.createGroup(group))).toBe(true);
    expect(isLeft(await repo.updateGroup(1, group))).toBe(true);
    expect(isLeft(await repo.removeGroup(1))).toBe(true);
    expect(isLeft(await repo.createItem(item))).toBe(true);
    expect(isLeft(await repo.updateItem(1, item))).toBe(true);
    expect(isLeft(await repo.removeItem(1))).toBe(true);
  });
});
