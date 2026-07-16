import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceKind,
} from '../../domain/finance/finance.entity';
import { useToast } from '../molecules/toast-context';

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function useFinanceSettings() {
  const toast = useToast();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () =>
      Promise.all([
        container.listFinanceCategories(),
        container.listFinanceMembers(),
      ]).then(([categoriesResult, membersResult]) => {
        fold(
          categoriesResult,
          (error) => toast(error.message, 'error'),
          (list) => setCategories(sortByName(list)),
        );
        fold(
          membersResult,
          (error) => toast(error.message, 'error'),
          (list) => setMembers(sortByName(list)),
        );
        setLoading(false);
      }),
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const mutate = useCallback(
    (result: Either<AppError, unknown>, successMessage: string): boolean =>
      fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(successMessage);
          load();
          return true;
        },
      ),
    [toast, load],
  );

  const createCategory = useCallback(
    async (input: { name: string; kind: FinanceKind }) =>
      mutate(await container.createFinanceCategory(input), 'Categoria criada'),
    [mutate],
  );

  const renameCategory = useCallback(
    async (uid: string, name: string) =>
      mutate(
        await container.updateFinanceCategory(uid, { name }),
        'Categoria renomeada',
      ),
    [mutate],
  );

  const setCategoryArchived = useCallback(
    async (uid: string, archived: boolean) =>
      mutate(
        await container.updateFinanceCategory(uid, { archived }),
        archived ? 'Categoria arquivada' : 'Categoria desarquivada',
      ),
    [mutate],
  );

  const deleteCategory = useCallback(
    async (uid: string) =>
      mutate(await container.deleteFinanceCategory(uid), 'Categoria excluída'),
    [mutate],
  );

  const createMember = useCallback(
    async (name: string) =>
      mutate(await container.createFinanceMember(name), 'Membro criado'),
    [mutate],
  );

  const renameMember = useCallback(
    async (uid: string, name: string) =>
      mutate(
        await container.updateFinanceMember(uid, { name }),
        'Membro renomeado',
      ),
    [mutate],
  );

  const setMemberArchived = useCallback(
    async (uid: string, archived: boolean) =>
      mutate(
        await container.updateFinanceMember(uid, { archived }),
        archived ? 'Membro arquivado' : 'Membro desarquivado',
      ),
    [mutate],
  );

  const deleteMember = useCallback(
    async (uid: string) =>
      mutate(await container.deleteFinanceMember(uid), 'Membro excluído'),
    [mutate],
  );

  return {
    categories,
    members,
    loading,
    createCategory,
    renameCategory,
    setCategoryArchived,
    deleteCategory,
    createMember,
    renameMember,
    setMemberArchived,
    deleteMember,
  };
}
