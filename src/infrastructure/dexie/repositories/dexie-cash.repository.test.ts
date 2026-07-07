import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieCashRepository } from './dexie-cash.repository';
import { isRight } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';

describe('DexieCashRepository refs por uid', () => {
  let db: PDVDatabase;
  let repo: DexieCashRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieCashRepository(db);
  });

  it('openSession gera uid', async () => {
    const result = await repo.openSession(100);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.uid).toBeTruthy();
  });

  it('closeSession acha por uid e preserva o uid', async () => {
    const opened = await repo.openSession(100);
    expect(isRight(opened)).toBe(true);
    if (!isRight(opened)) return;

    const result = await repo.closeSession(opened.right.uid, 150, 'ok');
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.uid).toBe(opened.right.uid);
      expect(result.right.cashFinal).toBe(150);
      expect(result.right.notes).toBe('ok');
      expect(result.right.closedAt).not.toBeNull();
    }
  });

  it('addMovement grava uid e sessionUid, listMovements filtra por sessionUid', async () => {
    const opened = await repo.openSession(100);
    expect(isRight(opened)).toBe(true);
    if (!isRight(opened)) return;
    const sessionUid = opened.right.uid;

    const added = await repo.addMovement({
      uid: createUid(),
      sessionUid,
      type: 'sangria',
      amount: 10,
      reason: 'teste',
      createdAt: Date.now(),
    });
    expect(isRight(added)).toBe(true);

    await repo.addMovement({
      uid: createUid(),
      sessionUid: 'outra-sessao',
      type: 'suprimento',
      amount: 20,
      reason: 'teste2',
      createdAt: Date.now(),
    });

    const result = await repo.listMovements(sessionUid);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toHaveLength(1);
      expect(result.right[0].sessionUid).toBe(sessionUid);
    }
  });
});
