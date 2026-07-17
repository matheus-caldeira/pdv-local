import { describe, expect, it } from 'vitest';
import {
  selectableCategories,
  selectableMembers,
} from './FinanceArchivedSupport';
import type {
  FamilyMember,
  FinanceCategory,
} from '../../../domain/finance/finance.entity';

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-active',
    name: 'Moradia',
    kind: 'expense',
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'cat-archived',
    name: 'Antiga',
    kind: 'expense',
    archived: true,
    createdAt: 1,
  },
];

const MEMBERS: FamilyMember[] = [
  { id: 1, uid: 'member-active', name: 'Ana', archived: false, createdAt: 1 },
  {
    id: 2,
    uid: 'member-archived',
    name: 'Carla',
    archived: true,
    createdAt: 1,
  },
];

describe('selectableCategories', () => {
  it('keeps active categories and drops archived ones not selected', () => {
    expect(selectableCategories(CATEGORIES, [])).toEqual([CATEGORIES[0]]);
  });

  it('keeps a selected archived category labeling it as archived', () => {
    const result = selectableCategories(CATEGORIES, ['cat-archived']);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Antiga (arquivada)');
  });
});

describe('selectableMembers', () => {
  it('keeps active members and drops archived ones not selected', () => {
    expect(selectableMembers(MEMBERS, [])).toEqual([MEMBERS[0]]);
  });

  it('keeps a selected archived member labeling it as archived', () => {
    const result = selectableMembers(MEMBERS, ['member-archived']);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Carla (arquivado)');
  });
});
