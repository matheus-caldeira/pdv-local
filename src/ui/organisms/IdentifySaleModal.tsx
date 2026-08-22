import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';

interface IdentifySaleModalProps {
  open: boolean;
  onUseTicket: () => void;
  onEnterName: () => void;
  onClose: () => void;
}

export function IdentifySaleModal({
  open,
  onUseTicket,
  onEnterName,
  onClose,
}: IdentifySaleModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Identificar a venda">
      <p className="text-sm text-ink-secondary">
        Esta venda não tem cliente. Como deseja identificá-la?
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button fullWidth onClick={onUseTicket}>
          Usar número da comanda
        </Button>
        <Button variant="ghost" fullWidth onClick={onEnterName}>
          Informar o nome
        </Button>
      </div>
    </Modal>
  );
}
