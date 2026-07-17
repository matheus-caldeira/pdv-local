import { Link } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';
import { Money } from '../../atoms/Money';
import { Button } from '../../atoms/Button';
import { FinanceSummaryCards } from '../../organisms/finance/FinanceSummaryCards';
import { FinanceOverdueCard } from '../../organisms/finance/FinanceOverdueCard';
import { FinanceCategoryProgress } from '../../organisms/finance/FinanceCategoryProgress';
import { FinanceMemberInvolvement } from '../../organisms/finance/FinanceMemberInvolvement';
import { useFinanceMonth } from '../../hooks/useFinanceMonth';
import { useFinanceDashboard } from '../../hooks/useFinanceDashboard';
import { formatDate } from '../../../domain/shared/format';
import type { FinanceDashboard } from '../../../application/finance/dashboard.usecases';

function isDashboardEmpty(dashboard: FinanceDashboard): boolean {
  return (
    dashboard.currentBalance === 0 &&
    dashboard.overdueEntries.length === 0 &&
    dashboard.pendingThisMonth.length === 0 &&
    dashboard.summary.actualIncome === 0 &&
    dashboard.summary.actualExpense === 0 &&
    dashboard.summary.plannedIncome === 0 &&
    dashboard.summary.plannedExpense === 0
  );
}

export function FinanceDashboardPage() {
  const { month } = useFinanceMonth();
  const { dashboard, loading, setEntryStatus } = useFinanceDashboard(month);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-ink-tertiary">
        Carregando...
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="py-10 text-center text-sm text-ink-tertiary">
        Não foi possível carregar os dados financeiros.
      </div>
    );
  }

  if (isDashboardEmpty(dashboard)) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface-2 px-6 py-10 text-center text-ink-tertiary">
        <PiggyBank size={48} />
        <h2 className="text-lg font-bold tracking-tight text-ink-primary">
          Comece pelo primeiro lançamento
        </h2>
        <p className="text-sm">
          Registre suas entradas e saídas para acompanhar o orçamento da família
          por aqui.
        </p>
        <Link
          to="/finance/entries"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-accent-text transition-colors hover:bg-accent-hover"
        >
          Criar primeiro lançamento
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Início financeiro
      </h1>
      <FinanceSummaryCards
        currentBalance={dashboard.currentBalance}
        summary={dashboard.summary}
      />
      <FinanceOverdueCard
        entries={dashboard.overdueEntries}
        expenseTotal={dashboard.overdueExpenseTotal}
        incomeTotal={dashboard.overdueIncomeTotal}
        onMarkPaid={(uid) => setEntryStatus(uid, 'paid')}
      />
      <section
        aria-label="Contas a pagar do mês"
        className="flex flex-col gap-2"
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Contas a pagar do mês
        </h3>
        {dashboard.pendingThisMonth.length === 0 ? (
          <div className="py-4 text-center text-sm text-ink-tertiary">
            Nenhuma conta pendente neste mês
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {dashboard.pendingThisMonth.map((entry) => (
              <li
                key={entry.uid}
                className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-ink-primary">
                    {entry.description}
                  </span>
                  <span className="text-xs text-ink-tertiary">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <Money
                    value={entry.amount}
                    className={
                      entry.kind === 'expense'
                        ? 'font-bold text-danger'
                        : 'font-bold text-success'
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Marcar ${entry.description} como pago`}
                    onClick={() => setEntryStatus(entry.uid, 'paid')}
                  >
                    Marcar pago
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <FinanceCategoryProgress categories={dashboard.summary.categories} />
      <FinanceMemberInvolvement involvement={dashboard.memberInvolvement} />
    </div>
  );
}
