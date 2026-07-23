import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { PDVDatabase } from '../dexie-database';
import { DexieCardInvoiceRepository } from './dexie-card-invoice.repository';

describe('DexieCardInvoiceRepository', () => {
  let db: PDVDatabase;
  let repo: DexieCardInvoiceRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieCardInvoiceRepository(db);
  });

  const invoice = {
    uid: 'inv-1',
    paymentMethodUid: 'card-1',
    month: '2026-08',
    dueDate: new Date(2026, 7, 5).getTime(),
    statedAmount: null,
    status: 'open' as const,
    paidAt: null,
    createdAt: 1,
    updatedAt: 1,
  };

  it('encontra por cartão e mês', async () => {
    await repo.create(invoice);
    const result = await repo.findByCardAndMonth('card-1', '2026-08');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right?.uid).toBe('inv-1');
  });

  it('devolve undefined quando não existe', async () => {
    const result = await repo.findByCardAndMonth('card-1', '2026-08');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBeUndefined();
  });

  it('lista por cartão ordenado por mês', async () => {
    await repo.create({ ...invoice, uid: 'b', month: '2026-09' });
    await repo.create({ ...invoice, uid: 'a', month: '2026-07' });
    const result = await repo.listByCard('card-1');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.map((i) => i.month)).toEqual(['2026-07', '2026-09']);
  });

  it('lista por mês', async () => {
    await repo.create(invoice);
    await repo.create({ ...invoice, uid: 'b', paymentMethodUid: 'card-2' });
    const result = await repo.listByMonth('2026-08');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(2);
  });

  it('atualiza', async () => {
    await repo.create(invoice);
    const result = await repo.update('inv-1', { statedAmount: 1000 });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.statedAmount).toBe(1000);
  });

  it('devolve Left ao atualizar uid inexistente', async () => {
    const result = await repo.update('nao-existe', { statedAmount: 1 });
    expect(isLeft(result)).toBe(true);
  });

  it('rejeita fatura duplicada do mesmo cartão e mês', async () => {
    await repo.create(invoice);
    const result = await repo.create({ ...invoice, uid: 'inv-2' });
    expect(isLeft(result)).toBe(true);
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.findByCardAndMonth('card-1', '2026-08'),
      repo.listByCard('card-1'),
      repo.listByMonth('2026-08'),
      repo.create(invoice),
      repo.update('inv-1', { statedAmount: 1 }),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
