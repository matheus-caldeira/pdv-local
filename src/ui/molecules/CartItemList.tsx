import { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { QtyStepper } from '../atoms/QtyStepper';
import { Modal } from './Modal';
import type { CartItem } from '../hooks/usePdvController';

interface CartItemListProps {
  cart: CartItem[];
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onSetObservation: (cartId: string, observation: string) => void;
}

function itemUnitTotal(item: CartItem): number {
  return item.salePrice + (item.customizationTotal || 0);
}

export function CartItemList({
  cart,
  onUpdateQty,
  onRemoveItem,
  onSetObservation,
}: CartItemListProps) {
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [obsText, setObsText] = useState('');

  function openObsEdit(cartId: string) {
    const item = cart.find((entry) => entry.cartId === cartId);
    setObsText(item?.observation || '');
    setEditingObsId(cartId);
  }

  function saveObs(cartId: string) {
    onSetObservation(cartId, obsText);
    setEditingObsId(null);
    setObsText('');
  }

  if (cart.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-ink-muted">
        Toque nos produtos para adicionar
      </div>
    );
  }

  return (
    <>
      {cart.map((item) => (
        <div
          key={item.cartId}
          className="border-b border-border py-3 last:border-b-0"
        >
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-semibold">{item.name}</span>
            <span className="text-xs text-ink-tertiary">
              <Money value={itemUnitTotal(item)} /> un.
            </span>
          </div>
          {item.customizations && item.customizations.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1">
              {item.customizations.map((customization, index) => (
                <span
                  key={index}
                  className="rounded-full bg-surface-inset px-1.5 py-px text-xs text-ink-tertiary"
                >
                  {customization.qty > 1 ? customization.qty + 'x ' : ''}
                  {customization.name}
                </span>
              ))}
            </div>
          )}
          {item.observation && (
            <div className="mb-1 text-xs italic text-ink-tertiary">
              Obs: {item.observation}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Money
              value={itemUnitTotal(item) * item.qty}
              className="mr-auto text-sm font-bold text-accent"
            />
            <button
              type="button"
              aria-label="Anotação"
              title="Anotação"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-info text-info hover:bg-surface-inset"
              onClick={() => openObsEdit(item.cartId)}
            >
              <MessageSquare size={13} />
            </button>
            <QtyStepper
              qty={item.qty}
              onDecrement={() => onUpdateQty(item.cartId, -1)}
              onIncrement={() => onUpdateQty(item.cartId, 1)}
            />
            <button
              type="button"
              aria-label="Remover item"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-danger text-danger hover:bg-surface-inset"
              onClick={() => onRemoveItem(item.cartId)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {editingObsId && (
        <Modal
          open
          onClose={() => setEditingObsId(null)}
          title="Anotação do Item"
        >
          <textarea
            aria-label="Anotação do item"
            className="w-full resize-y rounded-sm border border-border-emphasis bg-surface-inset p-3 text-base text-ink-primary outline-none focus:border-accent"
            value={obsText}
            onChange={(event) => setObsText(event.target.value)}
            placeholder="Ex: Sem cebola, bem passado, molho a parte..."
            rows={3}
            autoFocus
          />
          <Button
            fullWidth
            className="mt-3"
            onClick={() => saveObs(editingObsId)}
          >
            Salvar
          </Button>
        </Modal>
      )}
    </>
  );
}
