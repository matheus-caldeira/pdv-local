import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieFinanceAutomationRepository } from './dexie-finance-automation.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type {
  NewFinanceFormula,
  NewInstallmentPlan,
  NewRecurrence,
} from '../../../domain/finance/finance.entity';

function buildFormula(
  overrides: Partial<NewFinanceFormula> = {},
): NewFinanceFormula {
  return {
    uid: createUid(),
    name: 'DARF PJ',
    percent: 15.5,
    filter: { kind: 'income', categoryUids: [], memberUids: [] },
    outputKind: 'expense',
    outputCategoryUid: 'cat-impostos',
    outputDescription: 'DARF',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function buildRecurrence(
  overrides: Partial<NewRecurrence> = {},
): NewRecurrence {
  return {
    uid: createUid(),
    description: 'Aluguel',
    amount: 1500,
    kind: 'expense',
    categoryUid: 'cat-moradia',
    memberUids: ['m-1'],
    dayOfMonth: 5,
    startMonth: '2026-01',
    endMonth: null,
    active: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function buildPlan(
  overrides: Partial<NewInstallmentPlan> = {},
): NewInstallmentPlan {
  return {
    uid: createUid(),
    description: 'Notebook',
    totalAmount: 3000,
    installmentCount: 10,
    firstMonth: '2026-08',
    dayOfMonth: 10,
    kind: 'expense',
    categoryUid: 'cat-lazer',
    memberUids: ['m-1'],
    createdAt: 1,
    ...overrides,
  };
}

describe('DexieFinanceAutomationRepository', () => {
  let db: PDVDatabase;
  let repo: DexieFinanceAutomationRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieFinanceAutomationRepository(db);
  });

  it('saveFormula cria nova e listFormulas ordena por nome', async () => {
    const created = await repo.saveFormula(buildFormula({ name: 'Zebra' }));
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;
    expect(created.right.id).toBeTruthy();
    await repo.saveFormula(buildFormula({ name: 'Alfa' }));
    const listed = await repo.listFormulas();
    expect(isRight(listed)).toBe(true);
    if (!isRight(listed)) return;
    expect(listed.right.map((formula) => formula.name)).toEqual([
      'Alfa',
      'Zebra',
    ]);
  });

  it('saveFormula atualiza formula existente pelo uid', async () => {
    const created = await repo.saveFormula(buildFormula());
    if (!isRight(created)) return;
    const updated = await repo.saveFormula({
      ...created.right,
      percent: 20,
    });
    expect(isRight(updated)).toBe(true);
    if (!isRight(updated)) return;
    expect(updated.right.id).toBe(created.right.id);
    expect(updated.right.percent).toBe(20);
    const listed = await repo.listFormulas();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(1);
  });

  it('deleteFormula remove pelo uid', async () => {
    const created = await repo.saveFormula(buildFormula());
    if (!isRight(created)) return;
    const result = await repo.deleteFormula(created.right.uid);
    expect(isRight(result)).toBe(true);
    const listed = await repo.listFormulas();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(0);
  });

  it('saveRecurrence cria nova e listRecurrences ordena por descrição', async () => {
    const created = await repo.saveRecurrence(
      buildRecurrence({ description: 'Streaming' }),
    );
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;
    expect(created.right.id).toBeTruthy();
    await repo.saveRecurrence(buildRecurrence({ description: 'Aluguel' }));
    const listed = await repo.listRecurrences();
    expect(isRight(listed)).toBe(true);
    if (!isRight(listed)) return;
    expect(listed.right.map((recurrence) => recurrence.description)).toEqual([
      'Aluguel',
      'Streaming',
    ]);
  });

  it('saveRecurrence atualiza recorrência existente pelo uid', async () => {
    const created = await repo.saveRecurrence(buildRecurrence());
    if (!isRight(created)) return;
    const updated = await repo.saveRecurrence({
      ...created.right,
      amount: 1800,
      active: false,
    });
    expect(isRight(updated)).toBe(true);
    if (!isRight(updated)) return;
    expect(updated.right.id).toBe(created.right.id);
    expect(updated.right.amount).toBe(1800);
    const listed = await repo.listRecurrences();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(1);
  });

  it('deleteRecurrence remove pelo uid', async () => {
    const created = await repo.saveRecurrence(buildRecurrence());
    if (!isRight(created)) return;
    const result = await repo.deleteRecurrence(created.right.uid);
    expect(isRight(result)).toBe(true);
    const listed = await repo.listRecurrences();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(0);
  });

  it('createPlan persiste e listPlans ordena por createdAt desc', async () => {
    const older = await repo.createPlan(buildPlan({ createdAt: 1 }));
    expect(isRight(older)).toBe(true);
    if (!isRight(older)) return;
    expect(older.right.id).toBeTruthy();
    await repo.createPlan(buildPlan({ createdAt: 9, description: 'Sofá' }));
    const listed = await repo.listPlans();
    expect(isRight(listed)).toBe(true);
    if (!isRight(listed)) return;
    expect(listed.right.map((plan) => plan.description)).toEqual([
      'Sofá',
      'Notebook',
    ]);
  });

  it('deletePlan remove pelo uid', async () => {
    const created = await repo.createPlan(buildPlan());
    if (!isRight(created)) return;
    const result = await repo.deletePlan(created.right.uid);
    expect(isRight(result)).toBe(true);
    const listed = await repo.listPlans();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(0);
  });

  it('countCategoryRefs soma formulas (filtro e saída), recorrências e planos', async () => {
    await repo.saveFormula(
      buildFormula({
        filter: { kind: 'income', categoryUids: ['cat-x'], memberUids: [] },
        outputCategoryUid: 'cat-outra',
      }),
    );
    await repo.saveFormula(buildFormula({ outputCategoryUid: 'cat-x' }));
    await repo.saveFormula(buildFormula({ outputCategoryUid: 'cat-outra' }));
    await repo.saveRecurrence(buildRecurrence({ categoryUid: 'cat-x' }));
    await repo.saveRecurrence(buildRecurrence({ categoryUid: 'cat-outra' }));
    await repo.createPlan(buildPlan({ categoryUid: 'cat-x' }));
    const result = await repo.countCategoryRefs('cat-x');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(4);
  });

  it('countMemberRefs soma formulas, recorrências e planos que etiquetam o membro', async () => {
    await repo.saveFormula(
      buildFormula({
        filter: { kind: 'income', categoryUids: [], memberUids: ['m-x'] },
      }),
    );
    await repo.saveFormula(buildFormula());
    await repo.saveRecurrence(buildRecurrence({ memberUids: ['m-x', 'm-y'] }));
    await repo.saveRecurrence(buildRecurrence({ memberUids: ['m-y'] }));
    await repo.createPlan(buildPlan({ memberUids: ['m-x'] }));
    const result = await repo.countMemberRefs('m-x');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(3);
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.listFormulas(),
      repo.saveFormula(buildFormula()),
      repo.deleteFormula('uid'),
      repo.listRecurrences(),
      repo.saveRecurrence(buildRecurrence()),
      repo.deleteRecurrence('uid'),
      repo.listPlans(),
      repo.createPlan(buildPlan()),
      repo.deletePlan('uid'),
      repo.countCategoryRefs('cat'),
      repo.countMemberRefs('m'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
