import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import type { Order } from '../../domain/order/order.entity';

interface OpenTabPromptModalProps {
  tab: Order | null;
  customerName: string;
  onUseTab: () => void;
  onDismiss: () => void;
}

export function OpenTabPromptModal({
  tab,
  customerName,
  onUseTab,
  onDismiss,
}: OpenTabPromptModalProps) {
  if (!tab) return null;

  return (
    <Modal open onClose={onDismiss} title="Comanda em aberto">
      <p className="text-sm text-ink-secondary">
        {customerName} tem a comanda nº {tab.ticket} aberta. Lançar nela?
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button fullWidth onClick={onUseTab}>
          Usar comanda nº {tab.ticket}
        </Button>
        <Button variant="ghost" fullWidth onClick={onDismiss}>
          Continuar venda avulsa
        </Button>
      </div>
    </Modal>
  );
}
