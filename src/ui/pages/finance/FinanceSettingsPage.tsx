import { useFinanceSettings } from '../../hooks/useFinanceSettings';
import { FinanceCategoryManager } from '../../organisms/finance/FinanceCategoryManager';
import { FinanceMemberManager } from '../../organisms/finance/FinanceMemberManager';

export function FinanceSettingsPage() {
  const {
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
  } = useFinanceSettings();

  return (
    <div className="max-w-5xl">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">
        Configurações do financeiro
      </h1>
      {loading ? (
        <p className="py-10 text-center text-sm text-ink-tertiary">
          Carregando…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6">
          <FinanceCategoryManager
            categories={categories}
            onCreate={createCategory}
            onRename={renameCategory}
            onArchive={setCategoryArchived}
            onDelete={deleteCategory}
          />
          <FinanceMemberManager
            members={members}
            onCreate={createMember}
            onRename={renameMember}
            onArchive={setMemberArchived}
            onDelete={deleteMember}
          />
        </div>
      )}
    </div>
  );
}
