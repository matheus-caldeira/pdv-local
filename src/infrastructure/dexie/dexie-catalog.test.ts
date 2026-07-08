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

let productUidCounter = 0;

const newProduct = (over: Partial<NewProduct> = {}): NewProduct => ({
  uid: `product-${++productUidCounter}`,
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

  it('preserves the uid of a product across updates', async () => {
    const repo = new DexieProductRepository(db);
    const created = await repo.create(newProduct({ name: 'Original' }));
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;
    const originalUid = created.right.uid;

    const updated = await repo.update(
      created.right.id!,
      newProduct({ uid: 'attacker-uid', name: 'Renomeado' }),
    );
    expect(isRight(updated)).toBe(true);
    if (isRight(updated)) {
      expect(updated.right.uid).toBe(originalUid);
      expect(updated.right.name).toBe('Renomeado');
    }

    const stored = await db.products.get(created.right.id!);
    expect(stored?.uid).toBe(originalUid);
    expect(stored?.name).toBe('Renomeado');
  });

  it('returns RecordNotFoundError when updating a missing product', async () => {
    const repo = new DexieProductRepository(db);
    const result = await repo.update(999, newProduct());
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('RECORD_NOT_FOUND');
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
    uid: 'group-fixture-uid',
    name: 'Ponto',
    required: true,
    minQty: 1,
    maxQty: 1,
    chargeAfter: 0,
  };
  const item = {
    uid: 'item-fixture-uid',
    groupUid: 'group-1',
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
    const guid = isRight(created) ? created.right.uid : '';
    await repo.updateGroup(gid, { ...group, name: 'Ponto da carne' });
    expect((await db.customizationGroups.get(gid))?.name).toBe(
      'Ponto da carne',
    );

    const createdItem = await repo.createItem({ ...item, groupUid: guid });
    const iid = isRight(createdItem) ? createdItem.right.id! : 0;
    await repo.updateItem(iid, {
      ...item,
      groupUid: guid,
      name: 'Mal passado',
    });
    expect((await db.customizationItems.get(iid))?.name).toBe('Mal passado');

    const groups = await repo.listGroups();
    const items = await repo.listItems();
    expect(isRight(groups) && groups.right.length).toBe(1);
    expect(isRight(items) && items.right.length).toBe(1);

    await repo.removeGroup(gid);
    expect(await db.customizationGroups.count()).toBe(0);
    expect(await db.customizationItems.count()).toBe(0);
  });

  it('generates a uid for a group created without one', async () => {
    const repo = new DexieCustomizationRepository(db);
    const groupWithoutUid = {
      name: group.name,
      required: group.required,
      minQty: group.minQty,
      maxQty: group.maxQty,
      chargeAfter: group.chargeAfter,
    };
    const created = await repo.createGroup(groupWithoutUid as typeof group);
    expect(isRight(created)).toBe(true);
    if (isRight(created)) {
      expect(created.right.uid).toBeTruthy();
    }
  });

  it('removes a group with no items left to cascade', async () => {
    const repo = new DexieCustomizationRepository(db);
    const result = await repo.removeGroup(999);
    expect(isRight(result)).toBe(true);
  });

  it('preserves the uid of a group across updates', async () => {
    const repo = new DexieCustomizationRepository(db);
    const created = await repo.createGroup(group);
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;
    const originalUid = created.right.uid;

    const updated = await repo.updateGroup(created.right.id!, {
      ...group,
      uid: 'attacker-uid',
      name: 'Renomeado',
    });
    expect(isRight(updated)).toBe(true);
    if (isRight(updated)) {
      expect(updated.right.uid).toBe(originalUid);
      expect(updated.right.name).toBe('Renomeado');
    }

    const stored = await db.customizationGroups.get(created.right.id!);
    expect(stored?.uid).toBe(originalUid);
    expect(stored?.name).toBe('Renomeado');
  });

  it('returns RecordNotFoundError when updating a missing group', async () => {
    const repo = new DexieCustomizationRepository(db);
    const result = await repo.updateGroup(999, group);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('RECORD_NOT_FOUND');
    }
  });

  it('generates a uid for an item created without one', async () => {
    const repo = new DexieCustomizationRepository(db);
    const itemWithoutUid = {
      groupUid: item.groupUid,
      name: item.name,
      price: item.price,
      maxQty: item.maxQty,
      chargeAfter: item.chargeAfter,
      active: item.active,
    };
    const created = await repo.createItem(itemWithoutUid as typeof item);
    expect(isRight(created)).toBe(true);
    if (isRight(created)) {
      expect(created.right.uid).toBeTruthy();
    }
  });

  it('preserves the uid of an item across updates', async () => {
    const repo = new DexieCustomizationRepository(db);
    const created = await repo.createItem(item);
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;
    const originalUid = created.right.uid;

    const updated = await repo.updateItem(created.right.id!, {
      ...item,
      uid: 'attacker-uid',
      name: 'Renomeado',
    });
    expect(isRight(updated)).toBe(true);
    if (isRight(updated)) {
      expect(updated.right.uid).toBe(originalUid);
      expect(updated.right.name).toBe('Renomeado');
    }

    const stored = await db.customizationItems.get(created.right.id!);
    expect(stored?.uid).toBe(originalUid);
    expect(stored?.name).toBe('Renomeado');
  });

  it('returns RecordNotFoundError when updating a missing item', async () => {
    const repo = new DexieCustomizationRepository(db);
    const result = await repo.updateItem(999, item);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('RECORD_NOT_FOUND');
    }
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
