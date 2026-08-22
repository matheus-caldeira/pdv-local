import { Printer } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import type { Order } from '../../domain/order/order.entity';

interface TabOpenedModalProps {
  tab: Order | null;
  onContinue: () => void;
  onPrint: () => void;
}

export function TabOpenedModal({
  tab,
  onContinue,
  onPrint,
}: TabOpenedModalProps) {
  if (!tab) return null;

  return (
    <Modal open onClose={onContinue} title="Comanda aberta">
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
          Comanda
        </span>
        <span className="font-mono text-5xl font-extrabold tabular-nums text-accent">
          {tab.ticket}
        </span>
        {tab.customerName && (
          <span className="text-base font-semibold text-ink-primary">
            {tab.customerName}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button fullWidth onClick={onContinue}>
          Continuar comprando
        </Button>
        <Button variant="ghost" fullWidth onClick={onPrint}>
          <Printer size={16} /> Imprimir número
        </Button>
      </div>
    </Modal>
  );
}
