import { useState } from 'react';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { cn } from '../lib/cn';
import type { PayOption } from '../hooks/usePdvController';

interface PaymentPanelProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onFinalize: (option: PayOption, paymentMethod: string | null) => void;
}

const PAYMENT_METHODS = [
  { key: 'pix', label: 'PIX', icon: 'P' },
  { key: 'credito', label: 'Credito', icon: 'C' },
  { key: 'debito', label: 'Debito', icon: 'D' },
  { key: 'dinheiro', label: 'Dinheiro', icon: '$' },
];

export function PaymentPanel({
  open,
  total,
  onClose,
  onFinalize,
}: PaymentPanelProps) {
  const [step, setStep] = useState<'option' | 'method'>('option');
  const [payOption, setPayOption] = useState<PayOption | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  function close() {
    setStep('option');
    setPayOption(null);
    setSelectedPayment(null);
    onClose();
  }

  function chooseOption(option: PayOption) {
    setPayOption(option);
    setStep('method');
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === 'option' ? 'Como deseja pagar?' : 'Forma de Pagamento'}
    >
      <Money
        value={total}
        className="mb-4 block text-center text-3xl font-extrabold text-accent"
      />

      {step === 'option' ? (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-surface-inset p-4 text-base font-semibold active:bg-surface-2"
            onClick={() => chooseOption('now')}
          >
            Pagar agora
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-surface-inset p-4 text-base font-semibold active:bg-surface-2"
            onClick={() => onFinalize('tab', null)}
          >
            Abrir comanda
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-surface-inset p-4 text-base font-semibold active:bg-surface-2"
            onClick={() => chooseOption('delivery')}
          >
            Pagar na entrega
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.key}
                type="button"
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border-2 px-3 py-4 text-center transition-colors hover:bg-surface-inset',
                  selectedPayment === method.key
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border bg-surface-2',
                )}
                onClick={() => setSelectedPayment(method.key)}
              >
                <span className="text-xl font-extrabold">{method.icon}</span>
                <span className="text-sm font-semibold">{method.label}</span>
              </button>
            ))}
          </div>
          <Button
            fullWidth
            className="mt-4"
            disabled={!selectedPayment}
            onClick={() => onFinalize(payOption!, selectedPayment)}
          >
            Confirmar Pagamento
          </Button>
        </>
      )}
    </Modal>
  );
}
