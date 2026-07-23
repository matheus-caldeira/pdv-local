import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Money } from '../../atoms/Money';
import { FormField } from '../../molecules/FormField';
import { TextField } from '../../molecules/TextField';
import { formatDateTime } from '../../../domain/shared/format';
import type { InvoiceDetail } from '../../../application/finance/invoices.usecases';

interface FinanceInvoiceDetailProps {
  detail: InvoiceDetail;
  onSetAmount: (amount: number) => Promise<boolean>;
  onPay: () => Promise<boolean>;
}

function initialAmount(detail: InvoiceDetail): string {
  const stated = detail.invoice?.statedAmount ?? null;
  return stated === null ? '' : String(stated);
}

export function FinanceInvoiceDetail({
  detail,
  onSetAmount,
  onPay,
}: FinanceInvoiceDetailProps) {
  const [syncedDetail, setSyncedDetail] = useState(detail);
  const [amount, setAmount] = useState(() => initialAmount(detail));

  if (syncedDetail !== detail) {
    setSyncedDetail(detail);
    setAmount(initialAmount(detail));
  }

  const paid = detail.invoice?.status === 'paid';
  const finalTotal =
    detail.detailedTotal +
    (detail.reconciliation.kind === 'adjustment'
      ? detail.reconciliation.amount
      : 0);

  async function handleSaveAmount() {
    await onSetAmount(Number(amount));
  }

  return (
    <section aria-label="Conciliação da fatura" className="flex flex-col gap-3">
      {paid && detail.invoice?.paidAt !== null && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success bg-success-subtle px-4 py-2 text-sm font-semibold text-success"
        >
          <CheckCircle2 size={16} />
          Fatura paga em {formatDateTime(detail.invoice!.paidAt!)}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4 md:flex-row md:items-end">
        <FormField label="Valor da fatura" className="md:flex-1">
          <TextField
            type="number"
            min={0}
            step="0.01"
            disabled={paid}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormField>
        {!paid && (
          <Button
            size="sm"
            className="md:min-h-[44px]"
            disabled={amount.trim() === ''}
            onClick={handleSaveAmount}
          >
            Salvar valor
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-ink-secondary">
          <span>Total detalhado</span>
          <Money value={detail.detailedTotal} className="font-bold" />
        </div>
        {detail.reconciliation.kind === 'adjustment' && (
          <div className="flex items-center justify-between text-sm text-ink-secondary">
            <span>Ajuste</span>
            <Money
              value={detail.reconciliation.amount}
              className="font-bold text-danger"
            />
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-1 text-sm font-semibold text-ink-primary">
          <span>Total final</span>
          <Money value={finalTotal} className="font-extrabold" />
        </div>
      </div>

      {detail.reconciliation.kind === 'over' && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-md border border-warning bg-warning-subtle px-4 py-3"
        >
          <span className="text-sm font-bold text-ink-primary">
            Divergência na fatura
          </span>
          <span className="text-sm text-ink-secondary">
            Os lançamentos detalhados somam mais que o valor informado. Excesso
            de{' '}
            <Money
              value={detail.reconciliation.excess}
              className="font-bold text-danger"
            />
            . Revise os lançamentos ou o valor informado.
          </span>
        </div>
      )}

      {!paid && (
        <Button fullWidth disabled={detail.invoice === null} onClick={onPay}>
          Pagar fatura
        </Button>
      )}
    </section>
  );
}
