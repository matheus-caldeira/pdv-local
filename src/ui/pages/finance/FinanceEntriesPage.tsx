import { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { useFinanceMonth } from '../../hooks/useFinanceMonth';
import { useFinanceEntries } from '../../hooks/useFinanceEntries';
import { FinanceEntriesFilters } from '../../organisms/finance/FinanceEntriesFilters';
import { FinanceEntriesList } from '../../organisms/finance/FinanceEntriesList';
import { FinanceEntryFormModal } from '../../organisms/finance/FinanceEntryFormModal';
import type { EntryInput } from '../../../application/finance/entries.usecases';
import type { FinanceEntry } from '../../../domain/finance/finance.entity';

export function FinanceEntriesPage() {
  const { month } = useFinanceMonth();
  const {
    loading,
    entries,
    overdueCount,
    categories,
    members,
    paymentMethods,
    planCounts,
    closedMonths,
    isMonthClosed,
    filters,
    setFilters,
    overdueMode,
    setOverdueMode,
    createEntry,
    updateEntry,
    deleteEntry,
    setEntryStatus,
  } = useFinanceEntries(month);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  function openCreate() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEdit(entry: FinanceEntry) {
    setEditingEntry(entry);
    setModalOpen(true);
  }

  function submitEntry(input: EntryInput) {
    if (editingEntry) return updateEntry(editingEntry.uid, input);
    return createEntry(input);
  }

  async function handleSave(input: EntryInput) {
    const ok = await submitEntry(input);
    if (ok) setModalOpen(false);
  }

  async function handleDelete(uid: string) {
    const ok = await deleteEntry(uid);
    if (ok) setModalOpen(false);
  }

  function handleToggleStatus(entry: FinanceEntry) {
    setEntryStatus(entry.uid, entry.status === 'paid' ? 'pending' : 'paid');
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Lançamentos</h1>
        <Button size="sm" disabled={isMonthClosed} onClick={openCreate}>
          <Plus size={16} /> Novo lançamento
        </Button>
      </div>

      {isMonthClosed && (
        <div className="flex items-center gap-2 rounded-md border border-warning bg-warning-subtle px-4 py-3 text-sm text-ink-primary">
          <Lock size={16} className="shrink-0 text-warning" />
          <span>
            Este mês está fechado: criar, editar e excluir lançamentos está
            bloqueado. Marcar como pago ou pendente continua disponível.
          </span>
        </div>
      )}

      <FinanceEntriesFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        members={members}
        paymentMethods={paymentMethods}
        overdueMode={overdueMode}
        overdueCount={overdueCount}
        onToggleOverdue={() => setOverdueMode(!overdueMode)}
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-tertiary">
          Carregando...
        </p>
      ) : (
        <FinanceEntriesList
          entries={entries}
          categories={categories}
          planCounts={planCounts}
          closedMonths={closedMonths}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <FinanceEntryFormModal
        open={modalOpen}
        entry={editingEntry}
        categories={categories}
        members={members}
        paymentMethods={paymentMethods}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </section>
  );
}
