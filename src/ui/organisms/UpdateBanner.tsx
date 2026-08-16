import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { useAppUpdate } from '../hooks/useAppUpdate';

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useAppUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[9998] flex items-center justify-between gap-3 bg-cardapio-bg px-4 py-3 text-cardapio-text shadow-lg"
    >
      <span className="text-sm font-medium">Atualização disponível</span>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={applyUpdate}>
          Reiniciar agora
        </Button>
        <button
          type="button"
          aria-label="Dispensar"
          onClick={() => setDismissed(true)}
          className="rounded-md p-2 text-cardapio-muted transition-colors hover:bg-cardapio-surface hover:text-cardapio-text"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
