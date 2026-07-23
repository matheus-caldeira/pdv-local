import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import {
  DexieBackupRepository,
  type FileSaver,
} from './dexie-backup.repository';
import { isRight } from '../../../domain/shared/either';
import type {
  NewBudgetItem,
  NewFamilyMember,
  NewFinanceCategory,
  NewFinanceEntry,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewMonthClosing,
  NewRecurrence,
} from '../../../domain/finance/finance.entity';
import type {
  NewCardInvoice,
  NewPaymentMethod,
} from '../../../domain/finance/payment-method.entity';
import type { NewProduct } from '../../../domain/product/product.entity';
import type { BusinessConfig } from '../../../domain/config/config.entity';

interface SavedFile {
  content: string;
  filename: string;
  type: string;
}

class MemorySaver implements FileSaver {
  readonly saved: SavedFile[] = [];

  save(content: string, filename: string, type: string): void {
    this.saved.push({ content, filename, type });
  }
}

const product = (uid: string, name = 'Suco'): NewProduct => ({
  uid,
  name,
  category: 'Bebidas',
  costPrice: 2,
  salePrice: 5,
  stock: 10,
  active: true,
  customizationGroupIds: [],
  createdAt: 1,
  updatedAt: 1,
});

const businessConfig = (name: string): BusinessConfig => ({
  id: 1,
  name,
  document: '',
  phone: '',
  address: '',
  ticketCounter: 1,
  ticketLimit: 999,
  ticketAutoReset: true,
  statusControlEnabled: false,
  businessTypeId: '',
  enabledModules: [],
  extra: {},
});

const familyMember = (uid: string, name = 'Ana'): NewFamilyMember => ({
  uid,
  name,
  archived: false,
  createdAt: 1,
});

const financeCategory = (uid: string): NewFinanceCategory => ({
  uid,
  name: 'Mercado',
  kind: 'expense',
  archived: false,
  createdAt: 1,
});

const financeEntry = (uid: string): NewFinanceEntry => ({
  uid,
  description: 'Feira da semana, com "extras"\ne frutas',
  amount: 120.5,
  kind: 'expense',
  categoryUid: 'cat-1',
  memberUids: ['mem-1', 'mem-2'],
  date: 1,
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
});

const budgetItem = (uid: string): NewBudgetItem => ({
  uid,
  categoryUid: 'cat-1',
  amount: 400,
  month: null,
  createdAt: 1,
  updatedAt: 1,
});

const financeFormula = (uid: string): NewFinanceFormula => ({
  uid,
  name: 'Dízimo',
  percent: 10,
  filter: { kind: 'income', categoryUids: [], memberUids: [] },
  outputKind: 'expense',
  outputCategoryUid: 'cat-1',
  outputDescription: 'Dízimo',
  createdAt: 1,
  updatedAt: 1,
});

const recurrence = (uid: string): NewRecurrence => ({
  uid,
  description: 'Aluguel',
  amount: 1500,
  kind: 'expense',
  categoryUid: 'cat-1',
  memberUids: ['mem-1'],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
});

const installmentPlan = (uid: string): NewInstallmentPlan => ({
  uid,
  description: 'Notebook',
  totalAmount: 3000,
  installmentCount: 10,
  firstMonth: '2026-01',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid: 'cat-1',
  memberUids: ['mem-1'],
  createdAt: 1,
});

const monthClosing = (uid: string, month: string): NewMonthClosing => ({
  uid,
  month,
  closedAt: 1,
  plannedIncome: 0,
  plannedExpense: 0,
  plannedBalance: 0,
  actualIncome: 0,
  actualExpense: 0,
  actualBalance: 0,
  categories: [],
});

const paymentMethod = (uid: string): NewPaymentMethod => ({
  uid,
  name: 'Nubank',
  type: 'credit',
  closingDay: 25,
  dueDay: 5,
  archived: false,
  createdAt: 1,
});

const cardInvoice = (uid: string): NewCardInvoice => ({
  uid,
  paymentMethodUid: 'pay-1',
  month: '2026-08',
  dueDate: 1,
  statedAmount: null,
  status: 'open',
  paidAt: null,
  createdAt: 1,
  updatedAt: 1,
});

const FINANCE_TABLES = [
  'financeMembers',
  'financeCategories',
  'financeEntries',
  'financeBudgetItems',
  'financeFormulas',
  'financeRecurrences',
  'financeInstallmentPlans',
  'financeClosings',
  'financePaymentMethods',
  'financeCardInvoices',
] as const;

async function seedAllFinanceTables(db: PDVDatabase) {
  await db.financeMembers.add(familyMember('mem-1'));
  await db.financeCategories.add(financeCategory('cat-1'));
  await db.financeEntries.add(financeEntry('ent-1'));
  await db.financeBudgetItems.add(budgetItem('bud-1'));
  await db.financeFormulas.add(financeFormula('for-1'));
  await db.financeRecurrences.add(recurrence('rec-1'));
  await db.financeInstallmentPlans.add(installmentPlan('pla-1'));
  await db.financeClosings.add(monthClosing('clo-1', '2026-06'));
  await db.financePaymentMethods.add(paymentMethod('pay-1'));
  await db.financeCardInvoices.add(cardInvoice('inv-1'));
}

describe('DexieBackupRepository — tabelas finance', () => {
  let db: PDVDatabase;
  let saver: MemorySaver;
  let repo: DexieBackupRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    saver = new MemorySaver();
    repo = new DexieBackupRepository(db, saver);
  });

  it('hasData é true com dados apenas em tabela finance', async () => {
    await db.financeClosings.add(monthClosing('clo-1', '2026-06'));
    const result = await repo.hasData();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(true);
  });

  it('exportAll inclui as tabelas finance no JSON', async () => {
    await db.products.add(product('pro-1'));
    await db.config.put(businessConfig('Bar do Zé'));
    await seedAllFinanceTables(db);
    const result = await repo.exportAll('json');
    expect(isRight(result)).toBe(true);
    expect(saver.saved).toHaveLength(1);
    expect(saver.saved[0].filename).toBe('pdv-backup.json');
    const data = JSON.parse(saver.saved[0].content);
    for (const table of FINANCE_TABLES) {
      expect(data[table]).toHaveLength(1);
    }
    expect(data.products).toHaveLength(1);
    expect(data.config).toHaveLength(1);
  });

  it('exportAll em CSV gera arquivo para entidade finance com dados', async () => {
    await db.products.add(product('pro-1'));
    await db.financeMembers.add(familyMember('mem-1'));
    const result = await repo.exportAll('csv');
    expect(isRight(result)).toBe(true);
    expect(saver.saved.map((file) => file.filename)).toEqual([
      'pdv-products.csv',
      'pdv-financeMembers.csv',
    ]);
  });

  it('exportEntity exporta uma entidade finance em JSON', async () => {
    await db.financeClosings.add(monthClosing('clo-1', '2026-06'));
    const result = await repo.exportEntity('financeClosings', 'json');
    expect(isRight(result)).toBe(true);
    expect(saver.saved[0].filename).toBe('pdv-financeClosings.json');
    const items = JSON.parse(saver.saved[0].content);
    expect(items).toHaveLength(1);
    expect(items[0].month).toBe('2026-06');
  });

  it('importEntity importa entidades finance descartando ids', async () => {
    const file = new File(
      [JSON.stringify([{ ...familyMember('mem-1'), id: 99 }])],
      'membros.json',
    );
    const result = await repo.importEntity('financeMembers', file);
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(1);
    const stored = await db.financeMembers.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).not.toBe(99);
    expect(stored[0].name).toBe('Ana');
  });

  it('reimporta um CSV de lançamentos preservando valores compostos', async () => {
    await db.financeEntries.add(financeEntry('ent-1'));
    await repo.exportEntity('financeEntries', 'csv');
    const content = saver.saved[0].content;
    await db.financeEntries.clear();
    const result = await repo.importEntity(
      'financeEntries',
      new File([content], 'pdv-financeEntries.csv'),
    );
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(1);
    const stored = await db.financeEntries.toArray();
    expect(stored[0].uid).toBe('ent-1');
    expect(stored[0].description).toBe(
      'Feira da semana, com "extras"\ne frutas',
    );
    expect(stored[0].memberUids).toEqual(['mem-1', 'mem-2']);
    expect(stored[0].amount).toBe(120.5);
  });

  it('reimporta um CSV de itens de orçamento preservando month nulo', async () => {
    await db.financeBudgetItems.add(budgetItem('bud-1'));
    await repo.exportEntity('financeBudgetItems', 'csv');
    const content = saver.saved[0].content;
    await db.financeBudgetItems.clear();
    const result = await repo.importEntity(
      'financeBudgetItems',
      new File([content], 'pdv-financeBudgetItems.csv'),
    );
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(1);
    const stored = await db.financeBudgetItems.toArray();
    expect(stored[0].month).toBeNull();
    expect(stored[0].amount).toBe(400);
  });

  it('reimporta um CSV de membros preservando archived booleano', async () => {
    await db.financeMembers.add(familyMember('mem-1'));
    await repo.exportEntity('financeMembers', 'csv');
    const content = saver.saved[0].content;
    await db.financeMembers.clear();
    const result = await repo.importEntity(
      'financeMembers',
      new File([content], 'pdv-financeMembers.csv'),
    );
    expect(isRight(result)).toBe(true);
    const stored = await db.financeMembers.toArray();
    expect(stored[0].archived).toBe(false);
  });

  it('reimporta um CSV de recorrências preservando endMonth nulo e active booleano', async () => {
    await db.financeRecurrences.add(recurrence('rec-1'));
    await repo.exportEntity('financeRecurrences', 'csv');
    const content = saver.saved[0].content;
    await db.financeRecurrences.clear();
    const result = await repo.importEntity(
      'financeRecurrences',
      new File([content], 'pdv-financeRecurrences.csv'),
    );
    expect(isRight(result)).toBe(true);
    const stored = await db.financeRecurrences.toArray();
    expect(stored[0].endMonth).toBeNull();
    expect(stored[0].active).toBe(true);
    expect(stored[0].startMonth).toBe('2026-01');
  });

  it('reimporta um CSV de lançamentos preservando campos de origem nulos', async () => {
    await db.financeEntries.add(financeEntry('ent-1'));
    await repo.exportEntity('financeEntries', 'csv');
    const content = saver.saved[0].content;
    await db.financeEntries.clear();
    const result = await repo.importEntity(
      'financeEntries',
      new File([content], 'pdv-financeEntries.csv'),
    );
    expect(isRight(result)).toBe(true);
    const stored = await db.financeEntries.toArray();
    expect(stored[0].sourceUid).toBeNull();
    expect(stored[0].installmentNumber).toBeNull();
    expect(stored[0].formulaBaseMonth).toBeNull();
  });

  it('importDemo substitui os dados do PDV preservando as tabelas finance', async () => {
    await db.products.add(product('pro-1', 'Antigo'));
    await db.customers.add({
      uid: 'cus-1',
      name: 'Cliente',
      addresses: [],
      extra: {},
      createdAt: 1,
      updatedAt: 1,
    });
    await seedAllFinanceTables(db);
    const result = await repo.importDemo({
      products: [product('pro-2', 'Demo')],
      config: [businessConfig('Demo Lanches')],
    });
    expect(isRight(result)).toBe(true);
    const products = await db.products.toArray();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Demo');
    expect(await db.customers.count()).toBe(0);
    const config = await db.config.toArray();
    expect(config[0].name).toBe('Demo Lanches');
    for (const table of FINANCE_TABLES) {
      expect(await db.table(table).count()).toBe(1);
    }
  });

  it('exporta e reimporta meios de pagamento preservando dias nulos', async () => {
    await db.financePaymentMethods.add(paymentMethod('pay-1'));
    await db.financePaymentMethods.add({
      ...paymentMethod('pay-2'),
      name: 'Dinheiro',
      type: 'cash',
      closingDay: null,
      dueDay: null,
    });
    await repo.exportEntity('financePaymentMethods', 'csv');
    const content = saver.saved[0].content;
    await db.financePaymentMethods.clear();
    const result = await repo.importEntity(
      'financePaymentMethods',
      new File([content], 'pdv-financePaymentMethods.csv'),
    );
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(2);
    const stored = await db.financePaymentMethods.orderBy('uid').toArray();
    expect(stored[0].name).toBe('Nubank');
    expect(stored[0].closingDay).toBe(25);
    expect(stored[1].name).toBe('Dinheiro');
    expect(stored[1].closingDay).toBeNull();
    expect(stored[1].dueDay).toBeNull();
  });

  it('exporta e reimporta faturas preservando valores nulos', async () => {
    await db.financeCardInvoices.add(cardInvoice('inv-1'));
    await repo.exportEntity('financeCardInvoices', 'csv');
    const content = saver.saved[0].content;
    await db.financeCardInvoices.clear();
    const result = await repo.importEntity(
      'financeCardInvoices',
      new File([content], 'pdv-financeCardInvoices.csv'),
    );
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(1);
    const stored = await db.financeCardInvoices.toArray();
    expect(stored[0].uid).toBe('inv-1');
    expect(stored[0].paymentMethodUid).toBe('pay-1');
    expect(stored[0].month).toBe('2026-08');
    expect(stored[0].statedAmount).toBeNull();
    expect(stored[0].paidAt).toBeNull();
  });

  it('exportAll e reimport preservam meios de pagamento e faturas', async () => {
    await db.financePaymentMethods.add(paymentMethod('pay-1'));
    await db.financeCardInvoices.add(cardInvoice('inv-1'));
    const result = await repo.exportAll('json');
    expect(isRight(result)).toBe(true);
    const data = JSON.parse(saver.saved[0].content);
    expect(data.financePaymentMethods).toHaveLength(1);
    expect(data.financeCardInvoices).toHaveLength(1);
    await db.financePaymentMethods.clear();
    await db.financeCardInvoices.clear();
    await repo.importEntity(
      'financePaymentMethods',
      new File(
        [JSON.stringify(data.financePaymentMethods)],
        'financePaymentMethods.json',
      ),
    );
    await repo.importEntity(
      'financeCardInvoices',
      new File(
        [JSON.stringify(data.financeCardInvoices)],
        'financeCardInvoices.json',
      ),
    );
    const methods = await db.financePaymentMethods.toArray();
    const invoices = await db.financeCardInvoices.toArray();
    expect(methods[0].uid).toBe('pay-1');
    expect(invoices[0].uid).toBe('inv-1');
    expect(invoices[0].paymentMethodUid).toBe('pay-1');
  });

  it('wipeAll apaga todas as tabelas, incluindo as finance', async () => {
    await db.products.add(product('pro-1'));
    await db.config.put(businessConfig('Bar do Zé'));
    await seedAllFinanceTables(db);
    const result = await repo.wipeAll();
    expect(isRight(result)).toBe(true);
    for (const table of db.tables) {
      expect(await table.count()).toBe(0);
    }
  });
});
