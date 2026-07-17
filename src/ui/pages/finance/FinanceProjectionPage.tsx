import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Money } from '../../atoms/Money';
import { FinanceProjectionChart } from '../../organisms/finance/FinanceProjectionChart';
import {
  useFinanceProjection,
  type ProjectionMonthCount,
} from '../../hooks/useFinanceProjection';
import type {
  ProjectionPoint,
  ProjectionSource,
} from '../../../domain/finance/finance.rules';
import type { MonthKey } from '../../../domain/finance/finance.entity';
import { cn } from '../../lib/cn';

interface MonthOption {
  value: ProjectionMonthCount;
  label: string;
}

interface SourceOption {
  value: ProjectionSource;
  label: string;
  description: string;
}

const MONTH_OPTIONS: MonthOption[] = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];

const SOURCE_OPTIONS: SourceOption[] = [
  {
    value: 'entries',
    label: 'Lançamentos previstos',
    description:
      'Projeta com os lançamentos pendentes e as recorrências ainda não lançadas.',
  },
  {
    value: 'budget',
    label: 'Orçamento',
    description:
      'Projeta com os valores planejados no orçamento de cada categoria.',
  },
  {
    value: 'both',
    label: 'Ambos',
    description:
      'Combina orçamento e lançamentos, considerando o maior valor por categoria.',
  },
];

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function fullMonthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

function hasProjectionData(points: ProjectionPoint[]): boolean {
  return points.some(
    (point) =>
      point.plannedIncome !== 0 ||
      point.plannedExpense !== 0 ||
      point.balance !== 0,
  );
}

export function FinanceProjectionPage() {
  const {
    points,
    months,
    setMonths,
    source,
    setSource,
    loading,
    error,
    reload,
  } = useFinanceProjection();

  const lastPoint = points[points.length - 1];

  return (
    <section className="flex max-w-4xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Projeção</h1>
        <p className="text-sm text-ink-tertiary">
          Saldo projetado a partir do mês atual
        </p>
      </header>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Período
        </legend>
        <div className="mt-2 flex max-w-xs gap-1 rounded-md border border-border bg-surface-2 p-1">
          {MONTH_OPTIONS.map((option) => (
            <label key={option.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="projection-months"
                className="peer sr-only"
                checked={months === option.value}
                onChange={() => setMonths(option.value)}
              />
              <span className="block rounded-sm px-3 py-2 text-center text-sm font-semibold text-ink-tertiary transition-colors peer-checked:bg-accent-subtle peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-border-focus">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Fonte da projeção
        </legend>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {SOURCE_OPTIONS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="projection-source"
                className="peer sr-only"
                checked={source === option.value}
                onChange={() => setSource(option.value)}
              />
              <span className="flex h-full flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3 transition-colors peer-checked:border-accent peer-checked:bg-accent-subtle peer-focus-visible:outline-2 peer-focus-visible:outline-border-focus">
                <span className="text-sm font-semibold text-ink-primary">
                  {option.label}
                </span>
                <span className="text-xs text-ink-tertiary">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {loading ? (
        <p className="rounded-md border border-border bg-surface-2 px-4 py-6 text-center text-sm text-ink-tertiary">
          Carregando projeção…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-danger bg-danger-subtle px-6 py-8 text-center"
        >
          <p className="text-sm font-semibold text-danger">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : !hasProjectionData(points) ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 px-6 py-10 text-center">
          <h2 className="text-lg font-bold tracking-tight">
            Sem dados suficientes
          </h2>
          <p className="text-sm text-ink-tertiary">
            Cadastre um orçamento ou lançamentos previstos para ver a projeção
            do seu saldo.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border-emphasis bg-surface-inset px-4 py-3">
            <span className="text-sm font-semibold text-ink-secondary">
              Saldo projetado ao fim do período
            </span>
            <Money
              value={lastPoint.balance}
              className={cn(
                'text-lg font-extrabold',
                lastPoint.balance < 0 && 'text-danger',
              )}
            />
          </div>

          <div className="rounded-md border border-border bg-surface-2 p-4">
            <FinanceProjectionChart points={points} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-tertiary">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-success"
              />
              Saldo positivo
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-danger"
              />
              Saldo negativo
            </span>
            <span className="flex items-center gap-2">
              <Badge tone="info">projetado</Badge>
              Recorrências ainda não lançadas entram na projeção como valores
              projetados.
            </span>
          </div>

          <table className="w-full border-collapse max-md:hidden">
            <caption className="sr-only">Pontos da projeção por mês</caption>
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                <th
                  scope="col"
                  className="border-b border-border px-3 py-2 text-left"
                >
                  Mês
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-2 text-right"
                >
                  Entradas previstas
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-2 text-right"
                >
                  Saídas previstas
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-2 text-right"
                >
                  Variação
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-2 text-right"
                >
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.month} className="text-sm">
                  <th
                    scope="row"
                    className="border-b border-border px-3 py-2 text-left font-semibold text-ink-primary"
                  >
                    {fullMonthLabel(point.month)}
                  </th>
                  <td className="border-b border-border px-3 py-2 text-right">
                    <Money
                      value={point.plannedIncome}
                      className="text-success"
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right">
                    <Money
                      value={point.plannedExpense}
                      className="text-danger"
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right">
                    <Money
                      value={point.delta}
                      className={
                        point.delta < 0 ? 'text-danger' : 'text-success'
                      }
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2 text-right">
                    <Money
                      value={point.balance}
                      className={cn(
                        'font-bold',
                        point.balance < 0 && 'text-danger',
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="flex flex-col gap-2 md:hidden">
            {points.map((point) => (
              <li
                key={point.month}
                className="rounded-md border border-border bg-surface-2 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink-primary">
                    {fullMonthLabel(point.month)}
                  </span>
                  <Money
                    value={point.balance}
                    className={cn(
                      'font-bold',
                      point.balance < 0 && 'text-danger',
                    )}
                  />
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col gap-1">
                    <dt className="text-ink-tertiary">Entradas previstas</dt>
                    <dd>
                      <Money
                        value={point.plannedIncome}
                        className="text-success"
                      />
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-ink-tertiary">Saídas previstas</dt>
                    <dd>
                      <Money
                        value={point.plannedExpense}
                        className="text-danger"
                      />
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-ink-tertiary">Variação</dt>
                    <dd>
                      <Money
                        value={point.delta}
                        className={
                          point.delta < 0 ? 'text-danger' : 'text-success'
                        }
                      />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
