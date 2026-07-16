import { describe, expect, it } from 'vitest';
import {
  categoryOptions,
  KIND_OPTIONS,
  monthLabel,
} from './FinanceAutomationsSupport';
import type { FinanceCategory } from '../../../domain/finance/finance.entity';

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-food',
    name: 'Mercado',
    kind: 'expense',
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'cat-salary',
    name: 'Salário',
    kind: 'income',
    archived: false,
    createdAt: 1,
  },
];

describe('FinanceAutomationsSupport', () => {
  it('formats a month key as a pt-BR label', () => {
    expect(monthLabel('2026-07')).toMatch(/jul/i);
    expect(monthLabel('2026-07')).toContain('2026');
  });

  it('lists only categories of the given kind', () => {
    expect(categoryOptions(CATEGORIES, 'expense', '')).toEqual([
      { value: 'cat-food', label: 'Mercado' },
    ]);
  });

  it('appends an archived placeholder when the current uid is missing', () => {
    expect(categoryOptions(CATEGORIES, 'expense', 'cat-old')).toEqual([
      { value: 'cat-food', label: 'Mercado' },
      { value: 'cat-old', label: 'Categoria arquivada' },
    ]);
  });

  it('does not append a placeholder when the current uid is listed', () => {
    expect(categoryOptions(CATEGORIES, 'income', 'cat-salary')).toEqual([
      { value: 'cat-salary', label: 'Salário' },
    ]);
  });

  it('exposes the kind options in pt-BR', () => {
    expect(KIND_OPTIONS).toEqual([
      { value: 'income', label: 'Entrada' },
      { value: 'expense', label: 'Saída' },
    ]);
  });
});
