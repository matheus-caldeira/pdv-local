import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Modal } from '../../molecules/Modal';
import { FinanceClosingPreview } from '../../organisms/finance/FinanceClosingPreview';
import { FinanceClosingHistory } from '../../organisms/finance/FinanceClosingHistory';
import { useFinanceMonth } from '../../hooks/useFinanceMonth';
import { useFinanceClosings } from '../../hooks/useFinanceClosings';
import {
  compareMonths,
  currentMonthKey,
} from '../../../domain/finance/finance.rules';
import type { MonthKey } from '../../../domain/finance/finance.entity';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function monthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

export function FinanceClosingsPage() {
  const { month } = useFinanceMonth();
  const { preview, closings, loading, closeMonth, reopenMonth } =
    useFinanceClosings(month);
  const [currentMonth] = useState<MonthKey>(() => currentMonthKey(Date.now()));
  const [closeModal, setCloseModal] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<MonthKey | null>(null);

  const currentClosing =
    closings.find((closing) => closing.month === month) ?? null;
  const isFutureMonth = compareMonths(month, currentMonth) > 0;

  async function handleConfirmClose() {
    const ok = await closeMonth();
    if (ok) setCloseModal(false);
  }

  async function handleConfirmReopen() {
    const ok = await reopenMonth(reopenTarget!);
    if (ok) setReopenTarget(null);
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Fechamentos</h1>

      {loading ? (
        <p className="text-sm text-ink-tertiary">Carregando...</p>
      ) : preview ? (
        <FinanceClosingPreview
          monthLabel={monthLabel(month)}
          preview={preview}
          closing={currentClosing}
          isFutureMonth={isFutureMonth}
          onRequestClose={() => setCloseModal(true)}
          onRequestReopen={() => setReopenTarget(month)}
        />
      ) : (
        <p className="text-sm text-ink-tertiary">
          Não foi possível carregar o resumo do mês.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Histórico de fechamentos
        </h2>
        <FinanceClosingHistory
          closings={closings}
          onRequestReopen={(target) => setReopenTarget(target)}
        />
      </div>

      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title={`Fechar ${monthLabel(month)}`}
      >
        <p className="mb-4 text-sm text-ink-secondary">
          O resumo do mês será salvo e novos lançamentos ficarão bloqueados.
          Lançamentos pendentes poderão ser pagos depois do fechamento.
        </p>
        <Button fullWidth onClick={handleConfirmClose}>
          Confirmar fechamento
        </Button>
      </Modal>

      <Modal
        open={reopenTarget !== null}
        onClose={() => setReopenTarget(null)}
        title="Reabrir mês"
      >
        <p className="mb-4 text-sm text-ink-secondary">
          O resumo salvo de {reopenTarget ? monthLabel(reopenTarget) : ''} será
          descartado. Você poderá fechar o mês novamente depois.
        </p>
        <Button fullWidth variant="danger" onClick={handleConfirmReopen}>
          Confirmar reabertura
        </Button>
      </Modal>
    </section>
  );
}
