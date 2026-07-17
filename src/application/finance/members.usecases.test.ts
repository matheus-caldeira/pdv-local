import { describe, expect, it } from 'vitest';
import { isLeft, isRight, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import { FamilyMemberInUseError } from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type {
  NewFinanceEntry,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewRecurrence,
} from '../../domain/finance/finance.entity';
import {
  FakeFinanceAutomationRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceEntryRepository,
  FakeFinanceMemberRepository,
} from './fakes';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_MEMBER_NAME,
  makeCreateMember,
  makeDeleteMember,
  makeEnsureFinanceDefaults,
  makeListMembers,
  makeUpdateMember,
} from './members.usecases';

const unwrap = <E, A>(either: Either<E, A>): A =>
  isRight(either) ? either.right : expect.unreachable('esperava Right');

const unwrapLeft = <E, A>(either: Either<E, A>): E =>
  isLeft(either) ? either.left : expect.unreachable('esperava Left');

const makeEntry = (memberUid: string): NewFinanceEntry => ({
  uid: createUid(),
  description: 'Mercado',
  amount: 120,
  kind: 'expense',
  categoryUid: 'cat-market',
  memberUids: [memberUid],
  date: 100,
  month: '2026-07',
  status: 'pending',
  source: 'manual',
  sourceUid: null,
  installmentNumber: null,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  createdAt: 1,
  updatedAt: 1,
});

const makeFormula = (memberUid: string): NewFinanceFormula => ({
  uid: createUid(),
  name: 'DARF',
  percent: 15,
  filter: { kind: 'income', categoryUids: [], memberUids: [memberUid] },
  outputKind: 'expense',
  outputCategoryUid: 'cat-tax',
  outputDescription: 'DARF',
  createdAt: 1,
  updatedAt: 1,
});

const makeRecurrence = (memberUid: string): NewRecurrence => ({
  uid: createUid(),
  description: 'Aluguel',
  amount: 1500,
  kind: 'expense',
  categoryUid: 'cat-home',
  memberUids: [memberUid],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
});

const makePlan = (memberUid: string): NewInstallmentPlan => ({
  uid: createUid(),
  description: 'Notebook',
  totalAmount: 3000,
  installmentCount: 10,
  firstMonth: '2026-08',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid: 'cat-home',
  memberUids: [memberUid],
  createdAt: 1,
});

const setup = () => {
  const members = new FakeFinanceMemberRepository();
  const categories = new FakeFinanceCategoryRepository();
  const entries = new FakeFinanceEntryRepository();
  const automations = new FakeFinanceAutomationRepository();
  return { members, categories, entries, automations };
};

describe('makeListMembers', () => {
  it('retorna os membros cadastrados', async () => {
    const { members } = setup();
    await members.create('Ana');
    await members.create('Bruno');

    const result = unwrap(await makeListMembers(members)());

    expect(result.map((member) => member.name)).toEqual(['Ana', 'Bruno']);
  });

  it('propaga falha de infraestrutura', async () => {
    const { members } = setup();
    const error = new ConnectorError('falha simulada');
    members.failNext(error);

    expect(unwrapLeft(await makeListMembers(members)())).toBe(error);
  });
});

describe('makeCreateMember', () => {
  it('cria o membro com o nome aparado', async () => {
    const { members } = setup();

    const created = unwrap(await makeCreateMember(members)('  Ana  '));

    expect(created.name).toBe('Ana');
    expect(created.archived).toBe(false);
  });

  it('propaga falha de infraestrutura', async () => {
    const { members } = setup();
    const error = new ConnectorError('falha simulada');
    members.failNext(error);

    expect(unwrapLeft(await makeCreateMember(members)('Ana'))).toBe(error);
  });
});

describe('makeUpdateMember', () => {
  it('renomeia aparando o nome', async () => {
    const { members } = setup();
    const created = unwrap(await members.create('Ana'));

    const updated = unwrap(
      await makeUpdateMember(members)(created.uid, { name: '  Ana Maria  ' }),
    );

    expect(updated.name).toBe('Ana Maria');
  });

  it('arquiva sem alterar o nome', async () => {
    const { members } = setup();
    const created = unwrap(await members.create('Ana'));

    const updated = unwrap(
      await makeUpdateMember(members)(created.uid, { archived: true }),
    );

    expect(updated.archived).toBe(true);
    expect(updated.name).toBe('Ana');
  });

  it('propaga falha de infraestrutura', async () => {
    const { members } = setup();
    const error = new ConnectorError('falha simulada');
    members.failNext(error);

    expect(
      unwrapLeft(await makeUpdateMember(members)('uid', { name: 'Ana' })),
    ).toBe(error);
  });
});

describe('makeDeleteMember', () => {
  it('exclui membro sem nenhuma referência', async () => {
    const { members, entries, automations } = setup();
    const created = unwrap(await members.create('Ana'));
    const deleteMember = makeDeleteMember(members, entries, automations);

    expect(isRight(await deleteMember(created.uid))).toBe(true);
    expect(unwrap(await members.list())).toEqual([]);
  });

  it('rejeita quando um lançamento referencia o membro', async () => {
    const { members, entries, automations } = setup();
    const created = unwrap(await members.create('Ana'));
    await entries.create(makeEntry(created.uid));
    const deleteMember = makeDeleteMember(members, entries, automations);

    const error = unwrapLeft(await deleteMember(created.uid));

    expect(error).toBeInstanceOf(FamilyMemberInUseError);
    expect(unwrap(await members.list())).toHaveLength(1);
  });

  it('rejeita quando o filtro de uma fórmula referencia o membro', async () => {
    const { members, entries, automations } = setup();
    const created = unwrap(await members.create('Ana'));
    await automations.saveFormula(makeFormula(created.uid));
    const deleteMember = makeDeleteMember(members, entries, automations);

    expect(unwrapLeft(await deleteMember(created.uid))).toBeInstanceOf(
      FamilyMemberInUseError,
    );
  });

  it('rejeita quando uma recorrência referencia o membro', async () => {
    const { members, entries, automations } = setup();
    const created = unwrap(await members.create('Ana'));
    await automations.saveRecurrence(makeRecurrence(created.uid));
    const deleteMember = makeDeleteMember(members, entries, automations);

    expect(unwrapLeft(await deleteMember(created.uid))).toBeInstanceOf(
      FamilyMemberInUseError,
    );
  });

  it('rejeita quando um plano parcelado referencia o membro', async () => {
    const { members, entries, automations } = setup();
    const created = unwrap(await members.create('Ana'));
    await automations.createPlan(makePlan(created.uid));
    const deleteMember = makeDeleteMember(members, entries, automations);

    expect(unwrapLeft(await deleteMember(created.uid))).toBeInstanceOf(
      FamilyMemberInUseError,
    );
  });

  it('propaga falha ao contar lançamentos', async () => {
    const { members, entries, automations } = setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(
      unwrapLeft(await makeDeleteMember(members, entries, automations)('uid')),
    ).toBe(error);
  });

  it('propaga falha ao contar automações', async () => {
    const { members, entries, automations } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(
      unwrapLeft(await makeDeleteMember(members, entries, automations)('uid')),
    ).toBe(error);
  });

  it('propaga falha ao excluir', async () => {
    const { members, entries, automations } = setup();
    const created = unwrap(await members.create('Ana'));
    const error = new ConnectorError('falha simulada');
    members.failNext(error);

    expect(
      unwrapLeft(
        await makeDeleteMember(members, entries, automations)(created.uid),
      ),
    ).toBe(error);
  });
});

describe('makeEnsureFinanceDefaults', () => {
  it('semeia o membro "Eu" e as categorias padrão', async () => {
    const { members, categories } = setup();

    const result = await makeEnsureFinanceDefaults(members, categories)();

    expect(isRight(result)).toBe(true);
    const seededMembers = unwrap(await members.list());
    expect(seededMembers.map((member) => member.name)).toEqual([
      DEFAULT_MEMBER_NAME,
    ]);
    const seededCategories = unwrap(await categories.list());
    expect(
      seededCategories.map((category) => ({
        name: category.name,
        kind: category.kind,
      })),
    ).toEqual(DEFAULT_CATEGORIES);
  });

  it('é idempotente na segunda chamada', async () => {
    const { members, categories } = setup();
    const ensureDefaults = makeEnsureFinanceDefaults(members, categories);

    await ensureDefaults();
    await ensureDefaults();

    expect(unwrap(await members.list())).toHaveLength(1);
    expect(unwrap(await categories.list())).toHaveLength(
      DEFAULT_CATEGORIES.length,
    );
  });

  it('não duplica membro mesmo quando o existente está arquivado', async () => {
    const { members, categories } = setup();
    const created = unwrap(await members.create('Ana'));
    await members.update(created.uid, { archived: true });

    const result = await makeEnsureFinanceDefaults(members, categories)();

    expect(isRight(result)).toBe(true);
    expect(unwrap(await members.list())).toHaveLength(1);
    expect(unwrap(await categories.list())).toHaveLength(
      DEFAULT_CATEGORIES.length,
    );
  });

  it('não duplica categorias quando já existe alguma', async () => {
    const { members, categories } = setup();
    await categories.create({ name: 'Pets', kind: 'expense' });

    const result = await makeEnsureFinanceDefaults(members, categories)();

    expect(isRight(result)).toBe(true);
    expect(unwrap(await categories.list())).toHaveLength(1);
    expect(unwrap(await members.list())).toHaveLength(1);
  });

  it('propaga falha ao semear membro', async () => {
    const { members, categories } = setup();
    const error = new ConnectorError('falha simulada');
    members.failNext(error);

    expect(
      unwrapLeft(await makeEnsureFinanceDefaults(members, categories)()),
    ).toBe(error);
  });

  it('propaga falha ao semear categorias', async () => {
    const { members, categories } = setup();
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(
      unwrapLeft(await makeEnsureFinanceDefaults(members, categories)()),
    ).toBe(error);
  });
});
