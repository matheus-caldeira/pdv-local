import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight } from '../../domain/shared/either';
import { PDVDatabase } from './dexie-database';
import { DexieCashRepository } from './repositories/dexie-cash.repository';

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

describe('DexieCashRepository', () => {
  it('opens, finds, lists, adds movements and closes a session', async () => {
    const repo = new DexieCashRepository(db);

    const opened = await repo.openSession(100);
    expect(isRight(opened)).toBe(true);
    if (!isRight(opened)) return;
    const sessionId = opened.right.id!;

    const open = await repo.findOpenSession();
    expect(isRight(open) && open.right?.id).toBe(sessionId);

    await repo.addMovement({
      sessionId,
      type: 'suprimento',
      amount: 50,
      reason: 'troco',
      createdAt: 2,
    });
    await repo.addMovement({
      sessionId,
      type: 'sangria',
      amount: 20,
      reason: '',
      createdAt: 1,
    });

    const movements = await repo.listMovements(sessionId);
    expect(isRight(movements)).toBe(true);
    if (isRight(movements)) {
      expect(movements.right.map((m) => m.amount)).toEqual([50, 20]);
    }

    const closed = await repo.closeSession(sessionId, 130, '  fim  ');
    expect(isRight(closed)).toBe(true);
    if (isRight(closed)) {
      expect(closed.right.cashFinal).toBe(130);
      expect(closed.right.cashInitial).toBe(100);
    }

    const afterClose = await repo.findOpenSession();
    expect(isRight(afterClose) && afterClose.right).toBeUndefined();

    const second = await repo.openSession(10);
    expect(isRight(second)).toBe(true);

    const sessions = await repo.listSessions();
    expect(isRight(sessions)).toBe(true);
    if (isRight(sessions)) {
      expect(sessions.right).toHaveLength(2);
      expect(sessions.right[0].openedAt).toBeGreaterThanOrEqual(
        sessions.right[1].openedAt,
      );
    }
  });

  it('keeps fallbacks when closing a missing session', async () => {
    const repo = new DexieCashRepository(db);
    const closed = await repo.closeSession(999, 10, '');
    expect(isRight(closed)).toBe(true);
    if (isRight(closed)) {
      expect(closed.right.cashInitial).toBe(0);
      expect(closed.right.openedAt).toBeGreaterThan(0);
    }
  });

  it('returns Left for every method when the database fails', async () => {
    const repo = new DexieCashRepository(db);
    db.close();
    expect(isLeft(await repo.findOpenSession())).toBe(true);
    expect(isLeft(await repo.listSessions())).toBe(true);
    expect(isLeft(await repo.openSession(10))).toBe(true);
    expect(isLeft(await repo.closeSession(1, 10, ''))).toBe(true);
    expect(isLeft(await repo.listMovements(1))).toBe(true);
    expect(
      isLeft(
        await repo.addMovement({
          sessionId: 1,
          type: 'sangria',
          amount: 5,
          reason: '',
          createdAt: 0,
        }),
      ),
    ).toBe(true);
  });
});
