import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FormField } from '../../molecules/FormField';
import { Select } from '../../molecules/Select';
import { MonthPicker } from '../../molecules/MonthPicker';
import { FinanceInvoiceDetail } from '../../organisms/finance/FinanceInvoiceDetail';
import { FinanceInvoiceHistory } from '../../organisms/finance/FinanceInvoiceHistory';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { useCardInvoices } from '../../hooks/useCardInvoices';
import { useFinanceMonth } from '../../hooks/useFinanceMonth';

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-2 px-6 py-10 text-center">
      <CreditCard size={32} className="text-ink-tertiary" />
      <p className="text-sm font-semibold text-ink-primary">
        Nenhum cartão de crédito cadastrado
      </p>
      <p className="max-w-md text-sm text-ink-secondary">
        Cadastre um meio de pagamento do tipo crédito nas{' '}
        <Link
          to="/finance/settings"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          configurações do financeiro
        </Link>{' '}
        para acompanhar as faturas.
      </p>
    </div>
  );
}

export function FinanceInvoicesPage() {
  const { month, setMonth } = useFinanceMonth();
  const { loading, creditCards } = usePaymentMethods();
  const [selectedCard, setSelectedCard] = useState('');

  const availableCard = creditCards.some((card) => card.uid === selectedCard)
    ? selectedCard
    : (creditCards[0]?.uid ?? '');
  if (availableCard !== selectedCard) setSelectedCard(availableCard);

  const { detail, history, setAmount, payInvoice } = useCardInvoices(
    availableCard,
    month,
  );

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Faturas</h1>

      {loading ? (
        <p className="text-sm text-ink-tertiary">Carregando...</p>
      ) : creditCards.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <FormField label="Cartão" className="md:flex-1">
              <Select
                value={availableCard}
                onChange={(event) => setSelectedCard(event.target.value)}
              >
                {creditCards.map((card) => (
                  <option key={card.uid} value={card.uid}>
                    {card.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <MonthPicker value={month} onChange={setMonth} />
          </div>

          {detail && (
            <FinanceInvoiceDetail
              detail={detail}
              onSetAmount={setAmount}
              onPay={() => payInvoice(Date.now())}
            />
          )}

          <FinanceInvoiceHistory points={history} />
        </>
      )}
    </section>
  );
}
