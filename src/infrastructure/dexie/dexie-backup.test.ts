import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight } from '../../domain/shared/either';
import { PDVDatabase } from './dexie-database';
import {
  DexieBackupRepository,
  type FileSaver,
} from './repositories/dexie-backup.repository';

let db: PDVDatabase;

interface SavedFile {
  content: string;
  filename: string;
  type: string;
}

class FakeFileSaver implements FileSaver {
  files: SavedFile[] = [];
  save(content: string, filename: string, type: string): void {
    this.files.push({ content, filename, type });
  }
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  db = new PDVDatabase();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const product = (over: Record<string, unknown> = {}) => ({
  name: 'X-Burger',
  category: 'Lanches',
  costPrice: 8,
  salePrice: 20,
  stock: 0,
  active: true,
  customizationGroupIds: [] as number[],
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('DexieBackupRepository', () => {
  it('exports all data as a single JSON file', async () => {
    await db.products.add(product());
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    const result = await repo.exportAll('json');
    expect(isRight(result)).toBe(true);
    expect(saver.files).toHaveLength(1);
    expect(saver.files[0].filename).toBe('pdv-backup.json');
    const parsed = JSON.parse(saver.files[0].content);
    expect(parsed.products).toHaveLength(1);
    expect(parsed.version).toBe(1);
  });

  it('exports populated entities as CSV files only', async () => {
    await db.products.add(product({ name: 'A, B', category: 'x"y' }));
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportAll('csv');
    expect(saver.files.map((f) => f.filename)).toEqual(['pdv-products.csv']);
    expect(saver.files[0].content).toContain('"A, B"');
  });

  it('exports a single entity as JSON', async () => {
    await db.products.add(product());
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('products', 'json');
    expect(saver.files[0].filename).toBe('pdv-products.json');
  });

  it('skips CSV export for an empty entity', async () => {
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('products', 'csv');
    expect(saver.files).toHaveLength(0);
  });

  it('exports a populated entity as CSV', async () => {
    await db.products.add(product({ meta: { a: 1 } }));
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('products', 'csv');
    expect(saver.files[0].filename).toBe('pdv-products.csv');
  });

  it('imports a JSON array dropping ids', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File(
      [JSON.stringify([{ id: 99, ...product() }])],
      'p.json',
    );
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].id).not.toBe(99);
  });

  it('imports from a JSON object keyed by entity', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File(
      [JSON.stringify({ products: [product()] })],
      'backup.json',
    );
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
  });

  it('defaults to an empty list when the JSON object lacks the entity', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File([JSON.stringify({ other: [] })], 'backup.json');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(0);
  });

  it('imports from a CSV file parsing numbers and json cells', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,salePrice,meta\nBurger,15,"{""x"":1}"';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('Burger');
    expect(stored[0].salePrice).toBe(15);
    expect((stored[0] as unknown as { meta: unknown }).meta).toEqual({ x: 1 });
  });

  it('encodes null cells as empty in CSV export', async () => {
    await db.orders.add({
      sessionId: 1,
      items: [],
      total: 0,
      paymentMethod: null,
      customerName: 'X',
      ticket: '1',
      customerPhone: '',
      stage: 'aceito',
      status: 'open',
      createdAt: 1,
      updatedAt: 1,
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('orders', 'csv');
    const header = saver.files[0].content.split('\n')[0].split(',');
    const row = saver.files[0].content.split('\n')[1].split(',');
    expect(row[header.indexOf('paymentMethod')]).toBe('');
  });

  it('fills missing CSV columns with an empty string', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,salePrice\nBurger';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].salePrice).toBe('');
  });

  it('returns zero rows for a CSV without data lines', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File(['name,price'], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(0);
  });

  it('keeps a malformed quoted cell as text', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name\n"{bad json}"';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('{bad json}');
  });

  it('wipes every table', async () => {
    await db.products.add(product());
    await db.orders.add({ sessionId: 1 } as never);
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.wipeAll();
    expect(isRight(result)).toBe(true);
    expect(await db.products.count()).toBe(0);
    expect(await db.orders.count()).toBe(0);
  });

  it('reports no data when only config exists', async () => {
    await db.config.add({ id: 1 } as never);
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.hasData();
    expect(isRight(result) && result.right).toBe(false);
  });

  it('reports data when a data table is populated', async () => {
    await db.products.add(product());
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.hasData();
    expect(isRight(result) && result.right).toBe(true);
  });

  it('imports a demo snapshot preserving ids and replacing data', async () => {
    await db.products.add(product({ name: 'Old' }));
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.importDemo({
      products: [{ id: 7, ...product({ name: 'Seed' }) }],
      config: [{ id: 1, name: 'Demo' } as never],
    });
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(7);
    expect(stored[0].name).toBe('Seed');
    expect((await db.config.toArray())[0].name).toBe('Demo');
  });

  it('ignores entities missing from the demo snapshot', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.importDemo({ products: [] });
    expect(isRight(result)).toBe(true);
    expect(await db.orders.count()).toBe(0);
  });

  it('imports customers and customizations preserving ids', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.importDemo({
      customers: [{ id: 5, name: 'Ana', phone: '1', addresses: [] } as never],
      customizationGroups: [{ id: 2, name: 'Adicionais' } as never],
      customizationItems: [{ id: 3, groupId: 2, name: 'Bacon' } as never],
    });
    expect(isRight(result)).toBe(true);
    expect((await db.customers.toArray())[0].id).toBe(5);
    expect((await db.customizationGroups.toArray())[0].id).toBe(2);
    expect((await db.customizationItems.toArray())[0].id).toBe(3);
  });

  it('returns Left when the database fails', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    db.close();
    expect(isLeft(await repo.exportAll('json'))).toBe(true);
    expect(isLeft(await repo.exportEntity('products', 'json'))).toBe(true);
    expect(isLeft(await repo.wipeAll())).toBe(true);
    expect(isLeft(await repo.hasData())).toBe(true);
    expect(isLeft(await repo.importDemo({ products: [] }))).toBe(true);
    const file = new File(['[]'], 'p.json');
    expect(isLeft(await repo.importEntity('products', file))).toBe(true);
  });
});
