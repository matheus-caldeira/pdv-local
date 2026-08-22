import { useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Money } from '../atoms/Money';
import { QtyStepper } from '../atoms/QtyStepper';
import { Autocomplete } from '../molecules/Autocomplete';
import { Modal } from '../molecules/Modal';
import { TextField } from '../molecules/TextField';
import { customerSuggestionLabel } from '../../domain/customer/customer.rules';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';
import type { BusinessTypeRules } from '../../domain/business-type/business-type.entity';
import type { CartItem } from '../hooks/usePdvController';

interface CartProps {
  cart: CartItem[];
  total: number;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerSuggestions: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: () => void;
  address: string;
  onAddressChange: (value: string) => void;
  showAddress: boolean;
  matchedCustomer: Customer | null;
  ticket: string;
  onTicketChange: (value: string) => void;
  ordering?: BusinessTypeRules['ordering'];
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onSetObservation: (cartId: string, observation: string) => void;
  onFinalize: () => void;
  selectedTab?: Order | null;
  onLaunchToTab?: () => void;
  onOpenNewTab: () => void;
}

function itemUnitTotal(item: CartItem): number {
  return item.salePrice + (item.customizationTotal || 0);
}

export function Cart({
  cart,
  total,
  customerName,
  onCustomerNameChange,
  customerSuggestions,
  onSelectCustomer,
  onCreateCustomer,
  address,
  onAddressChange,
  showAddress,
  ticket,
  onTicketChange,
  ordering = 'optional',
  onUpdateQty,
  onRemoveItem,
  onSetObservation,
  onFinalize,
  selectedTab,
  onLaunchToTab,
  onOpenNewTab,
}: CartProps) {
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [obsText, setObsText] = useState('');

  const suggestionByUid = new Map(
    customerSuggestions.map((entry) => [entry.uid, entry]),
  );

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

  return (
    <div className="flex w-full flex-col rounded-lg border border-border bg-surface-2 md:max-h-[calc(100dvh-3rem)] md:w-[340px]">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-bold">Carrinho</h2>
      </div>

      <div className="flex flex-col gap-2 border-b border-border px-5 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Autocomplete
              label="Cliente"
              placeholder="Nome, telefone ou responsável"
              value={customerName}
              options={customerSuggestions.map((entry) => ({
                value: entry.uid,
                label: customerSuggestionLabel(entry),
                hint: entry.phone,
              }))}
              onChange={onCustomerNameChange}
              onSelect={(option) =>
                onSelectCustomer(suggestionByUid.get(option.value)!)
              }
            />
          </div>
          <IconButton aria-label="Cadastrar cliente" onClick={onCreateCustomer}>
            <Plus size={16} />
          </IconButton>
        </div>
        {showAddress && (
          <TextField
            type="text"
            aria-label="Endereço"
            placeholder="Endereço"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
          />
        )}
        {ordering === 'required' && (
          <TextField
            type="text"
            aria-label="Comanda / Mesa"
            placeholder="Comanda / Mesa"
            value={ticket}
            onChange={(event) => onTicketChange(event.target.value)}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {cart.length === 0 ? (
          <div className="py-8 text-center text-sm text-ink-muted">
            Toque nos produtos para adicionar
          </div>
        ) : (
          cart.map((item) => (
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
          ))
        )}
      </div>

      {(cart.length > 0 || ordering !== 'none') && (
        <div className="border-t border-border-emphasis px-5 py-4">
          {cart.length > 0 && (
            <>
              <div className="mb-3 flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <Money
                  value={total}
                  className="text-xl font-extrabold text-accent"
                />
              </div>
              <div className="flex flex-col gap-2">
                {selectedTab && (
                  <Button fullWidth onClick={onLaunchToTab}>
                    Lançar na comanda nº {selectedTab.ticket}
                  </Button>
                )}
                <Button
                  variant={selectedTab ? 'ghost' : 'accent'}
                  fullWidth
                  onClick={onFinalize}
                >
                  Finalizar Venda
                </Button>
              </div>
            </>
          )}
          {ordering !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              className={cart.length > 0 ? 'mt-2' : undefined}
              onClick={onOpenNewTab}
            >
              <Plus size={14} /> Nova comanda
            </Button>
          )}
        </div>
      )}

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
    </div>
  );
}
