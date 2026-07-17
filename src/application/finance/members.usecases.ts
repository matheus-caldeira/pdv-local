import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { FamilyMemberInUseError } from '../../domain/errors';
import type {
  FamilyMember,
  FinanceKind,
} from '../../domain/finance/finance.entity';
import type { FinanceMemberRepository } from '../../domain/finance/finance-member.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceAutomationRepository } from '../../domain/finance/finance-automation.repository';

export const DEFAULT_MEMBER_NAME = 'Eu';

export const DEFAULT_CATEGORIES: { name: string; kind: FinanceKind }[] = [
  { name: 'Moradia', kind: 'expense' },
  { name: 'Mercado', kind: 'expense' },
  { name: 'Transporte', kind: 'expense' },
  { name: 'Saúde', kind: 'expense' },
  { name: 'Educação', kind: 'expense' },
  { name: 'Lazer', kind: 'expense' },
  { name: 'Assinaturas', kind: 'expense' },
  { name: 'Impostos', kind: 'expense' },
  { name: 'Salário', kind: 'income' },
  { name: 'PJ', kind: 'income' },
  { name: 'Outras receitas', kind: 'income' },
];

export interface MemberChanges {
  name?: string;
  archived?: boolean;
}

export function makeListMembers(members: FinanceMemberRepository) {
  return async (): Promise<Either<AppError, FamilyMember[]>> => members.list();
}

export function makeCreateMember(members: FinanceMemberRepository) {
  return async (name: string): Promise<Either<AppError, FamilyMember>> =>
    members.create(name.trim());
}

export function makeUpdateMember(members: FinanceMemberRepository) {
  return async (
    uid: string,
    changes: MemberChanges,
  ): Promise<Either<AppError, FamilyMember>> => {
    const normalized =
      changes.name === undefined
        ? changes
        : { ...changes, name: changes.name.trim() };
    return members.update(uid, normalized);
  };
}

export function makeDeleteMember(
  members: FinanceMemberRepository,
  entries: FinanceEntryRepository,
  automations: FinanceAutomationRepository,
) {
  return async (uid: string): Promise<Either<AppError, void>> => {
    const entryRefs = await entries.countByMember(uid);
    if (isLeft(entryRefs)) return entryRefs;

    const automationRefs = await automations.countMemberRefs(uid);
    if (isLeft(automationRefs)) return automationRefs;

    if (entryRefs.right + automationRefs.right > 0) {
      return left(new FamilyMemberInUseError());
    }

    return members.delete(uid);
  };
}

export function makeEnsureFinanceDefaults(
  members: FinanceMemberRepository,
  categories: FinanceCategoryRepository,
) {
  return async (): Promise<Either<AppError, void>> => {
    const member = await members.ensureDefault(DEFAULT_MEMBER_NAME);
    if (isLeft(member)) return member;

    const seeded = await categories.ensureDefaults(DEFAULT_CATEGORIES);
    if (isLeft(seeded)) return seeded;

    return right(undefined);
  };
}
