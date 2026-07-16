import { useFinanceMonth } from '../../hooks/useFinanceMonth';
import { useFinanceBudget } from '../../hooks/useFinanceBudget';
import { FinanceBudgetTable } from '../../organisms/finance/FinanceBudgetTable';

export function FinanceBudgetPage() {
  const { month } = useFinanceMonth();
  const {
    lines,
    isClosed,
    loading,
    saveTemplate,
    saveOverride,
    removeOverride,
  } = useFinanceBudget(month);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Orçamento</h1>
      {isClosed && (
        <div
          role="note"
          className="rounded-md border border-warning bg-warning-subtle px-4 py-3 text-sm font-semibold text-warning"
        >
          Mês fechado: os ajustes deste mês estão bloqueados. O modelo continua
          editável e vale para os meses abertos.
        </div>
      )}
      {loading ? (
        <p className="text-sm text-ink-tertiary">Carregando orçamento…</p>
      ) : lines.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-2 px-4 py-6 text-center text-sm text-ink-tertiary">
          Nenhuma categoria cadastrada. Crie categorias na aba Config para
          montar o orçamento.
        </p>
      ) : (
        <FinanceBudgetTable
          lines={lines}
          monthLocked={isClosed}
          onSaveTemplate={saveTemplate}
          onSaveOverride={saveOverride}
          onRemoveOverride={removeOverride}
        />
      )}
    </section>
  );
}
