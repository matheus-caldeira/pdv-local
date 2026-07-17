import type {
  FamilyMember,
  FinanceCategory,
} from '../../../domain/finance/finance.entity';

export function selectableCategories(
  categories: FinanceCategory[],
  selectedUids: string[],
): FinanceCategory[] {
  return categories
    .filter(
      (category) => !category.archived || selectedUids.includes(category.uid),
    )
    .map((category) =>
      category.archived
        ? { ...category, name: `${category.name} (arquivada)` }
        : category,
    );
}

export function selectableMembers(
  members: FamilyMember[],
  selectedUids: string[],
): FamilyMember[] {
  return members
    .filter((member) => !member.archived || selectedUids.includes(member.uid))
    .map((member) =>
      member.archived
        ? { ...member, name: `${member.name} (arquivado)` }
        : member,
    );
}
