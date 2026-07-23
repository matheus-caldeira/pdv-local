import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieFinanceEntryRepository } from './dexie-finance-entry.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type { NewFinanceEntry } from '../../../domain/finance/finance.entity';

function buildEntry(overrides: Partial<NewFinanceEntry> = {}): NewFinanceEntry {
  return {
    uid: createUid(),
    description: 'Mercado do mês',
    amount: 100,
    kind: 'expense',
    categoryUid: 'cat-1',
    memberUids: ['member-1'],
    date: 100,
    month: '2026-07',
    status: 'pending',
    source: 'manual',
    sourceUid: null,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    paymentMethodUid: null,
    invoiceMonth: null,
    invoiceUid: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('DexieFinanceEntryRepository', () => {
  let db: PDVDatabase;
  let repo: DexieFinanceEntryRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieFinanceEntryRepository(db);
  });

  it('create persiste e retorna com id', async () => {
    const result = await repo.create(buildEntry());
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.id).toBeTruthy();
  });

  it('createMany persiste todas e retorna ids', async () => {
    const result = await repo.createMany([buildEntry(), buildEntry()]);
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(2);
    expect(result.right[0].id).toBeTruthy();
    expect(result.right[1].id).toBeTruthy();
    expect(result.right[0].id).not.toBe(result.right[1].id);
  });

  it('findByUid encontra a entry e retorna undefined quando não existe', async () => {
    const created = await repo.create(buildEntry());
    if (!isRight(created)) return;
    const found = await repo.findByUid(created.right.uid);
    expect(isRight(found)).toBe(true);
    if (!isRight(found)) return;
    expect(found.right?.uid).toBe(created.right.uid);
    const missing = await repo.findByUid('nao-existe');
    expect(isRight(missing)).toBe(true);
    if (!isRight(missing)) return;
    expect(missing.right).toBeUndefined();
  });

  it('list sem filtros retorna tudo ordenado por date e createdAt', async () => {
    await repo.create(
      buildEntry({ description: 'B', date: 200, createdAt: 5 }),
    );
    await repo.create(
      buildEntry({ description: 'A', date: 100, createdAt: 9 }),
    );
    await repo.create(
      buildEntry({ description: 'C', date: 200, createdAt: 2 }),
    );
    const result = await repo.list({});
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.map((entry) => entry.description)).toEqual([
      'A',
      'C',
      'B',
    ]);
  });

  it('list filtra por month', async () => {
    await repo.create(buildEntry({ month: '2026-07' }));
    await repo.create(buildEntry({ month: '2026-08' }));
    const result = await repo.list({ month: '2026-07' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].month).toBe('2026-07');
  });

  it('list filtra por status', async () => {
    await repo.create(buildEntry({ status: 'paid' }));
    await repo.create(buildEntry({ status: 'pending' }));
    const result = await repo.list({ status: 'paid' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].status).toBe('paid');
  });

  it('list filtra por kind', async () => {
    await repo.create(buildEntry({ kind: 'income' }));
    await repo.create(buildEntry({ kind: 'expense' }));
    const result = await repo.list({ kind: 'income' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].kind).toBe('income');
  });

  it('list filtra por categoryUid', async () => {
    await repo.create(buildEntry({ categoryUid: 'cat-a' }));
    await repo.create(buildEntry({ categoryUid: 'cat-b' }));
    const result = await repo.list({ categoryUid: 'cat-a' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].categoryUid).toBe('cat-a');
  });

  it('list filtra por memberUid contido em memberUids', async () => {
    await repo.create(buildEntry({ memberUids: ['m-1', 'm-2'] }));
    await repo.create(buildEntry({ memberUids: ['m-3'] }));
    const result = await repo.list({ memberUid: 'm-2' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].memberUids).toContain('m-2');
  });

  it('list filtra por texto sem diferenciar maiúsculas', async () => {
    await repo.create(buildEntry({ description: 'Conta de Luz' }));
    await repo.create(buildEntry({ description: 'Internet' }));
    const result = await repo.list({ text: 'luz' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].description).toBe('Conta de Luz');
  });

  it('list filtra por sourceUid e source', async () => {
    await repo.create(buildEntry({ source: 'recurrence', sourceUid: 'rec-1' }));
    await repo.create(
      buildEntry({ source: 'installment', sourceUid: 'plan-1' }),
    );
    await repo.create(buildEntry());
    const bySourceUid = await repo.list({ sourceUid: 'rec-1' });
    expect(isRight(bySourceUid)).toBe(true);
    if (!isRight(bySourceUid)) return;
    expect(bySourceUid.right).toHaveLength(1);
    expect(bySourceUid.right[0].sourceUid).toBe('rec-1');
    const bySource = await repo.list({ source: 'installment' });
    expect(isRight(bySource)).toBe(true);
    if (!isRight(bySource)) return;
    expect(bySource.right).toHaveLength(1);
    expect(bySource.right[0].source).toBe('installment');
  });

  it('list filtra por monthBefore', async () => {
    await repo.create(buildEntry({ month: '2026-05' }));
    await repo.create(buildEntry({ month: '2026-07' }));
    await repo.create(buildEntry({ month: '2026-08' }));
    const result = await repo.list({ monthBefore: '2026-07' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].month).toBe('2026-05');
  });

  it('list filtra por paymentMethodUid', async () => {
    await repo.create(buildEntry({ paymentMethodUid: 'card-a' }));
    await repo.create(buildEntry({ paymentMethodUid: 'card-b' }));
    const result = await repo.list({ paymentMethodUid: 'card-a' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].paymentMethodUid).toBe('card-a');
  });

  it('list filtra por invoiceMonth', async () => {
    await repo.create(buildEntry({ invoiceMonth: '2026-09' }));
    await repo.create(buildEntry({ invoiceMonth: '2026-10' }));
    const result = await repo.list({ invoiceMonth: '2026-09' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].invoiceMonth).toBe('2026-09');
  });

  it('list filtra por invoiceUid', async () => {
    await repo.create(buildEntry({ invoiceUid: 'inv-a' }));
    await repo.create(buildEntry({ invoiceUid: 'inv-b' }));
    const result = await repo.list({ invoiceUid: 'inv-a' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].invoiceUid).toBe('inv-a');
  });

  it('update aplica changes preservando uid e createdAt', async () => {
    const created = await repo.create(buildEntry({ createdAt: 42 }));
    if (!isRight(created)) return;
    const result = await repo.update(created.right.uid, {
      description: 'Editado',
      amount: 55,
      status: 'paid',
    });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.description).toBe('Editado');
    expect(result.right.amount).toBe(55);
    expect(result.right.status).toBe('paid');
    expect(result.right.uid).toBe(created.right.uid);
    expect(result.right.createdAt).toBe(42);
  });

  it('update de uid inexistente retorna RECORD_NOT_FOUND', async () => {
    const result = await repo.update('nao-existe', { amount: 10 });
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('RECORD_NOT_FOUND');
  });

  it('delete remove pelo uid', async () => {
    const created = await repo.create(buildEntry());
    if (!isRight(created)) return;
    const result = await repo.delete(created.right.uid);
    expect(isRight(result)).toBe(true);
    const listed = await repo.list({});
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(0);
  });

  it('deleteBySource exclui só pendentes do sourceUid fora de excludeMonths e retorna a contagem', async () => {
    await repo.create(
      buildEntry({ sourceUid: 'plan-1', status: 'pending', month: '2026-07' }),
    );
    await repo.create(
      buildEntry({ sourceUid: 'plan-1', status: 'pending', month: '2026-08' }),
    );
    await repo.create(
      buildEntry({ sourceUid: 'plan-1', status: 'pending', month: '2026-09' }),
    );
    await repo.create(
      buildEntry({ sourceUid: 'plan-1', status: 'paid', month: '2026-10' }),
    );
    await repo.create(
      buildEntry({ sourceUid: 'plan-2', status: 'pending', month: '2026-07' }),
    );
    const result = await repo.deleteBySource('plan-1', 'pending', ['2026-08']);
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(2);
    const remaining = await repo.list({});
    if (!isRight(remaining)) return;
    expect(remaining.right).toHaveLength(3);
    expect(
      remaining.right.map((entry) => [entry.sourceUid, entry.month]),
    ).toEqual(
      expect.arrayContaining([
        ['plan-1', '2026-08'],
        ['plan-1', '2026-10'],
        ['plan-2', '2026-07'],
      ]),
    );
  });

  it('listPaid retorna apenas entries pagas', async () => {
    await repo.create(buildEntry({ status: 'paid' }));
    await repo.create(buildEntry({ status: 'pending' }));
    const result = await repo.listPaid();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
    expect(result.right[0].status).toBe('paid');
  });

  it('countByCategory conta entries da categoria', async () => {
    await repo.create(buildEntry({ categoryUid: 'cat-a' }));
    await repo.create(buildEntry({ categoryUid: 'cat-a' }));
    await repo.create(buildEntry({ categoryUid: 'cat-b' }));
    const result = await repo.countByCategory('cat-a');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(2);
  });

  it('countByMember conta entries etiquetadas com o membro', async () => {
    await repo.create(buildEntry({ memberUids: ['m-1', 'm-2'] }));
    await repo.create(buildEntry({ memberUids: ['m-2'] }));
    await repo.create(buildEntry({ memberUids: ['m-3'] }));
    const result = await repo.countByMember('m-2');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(2);
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.list({}),
      repo.findByUid('uid'),
      repo.create(buildEntry()),
      repo.createMany([buildEntry()]),
      repo.update('uid', { amount: 1 }),
      repo.delete('uid'),
      repo.deleteBySource('uid', 'pending', []),
      repo.listPaid(),
      repo.countByCategory('cat'),
      repo.countByMember('m'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
