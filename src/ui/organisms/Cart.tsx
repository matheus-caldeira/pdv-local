import { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { QtyStepper } from '../atoms/QtyStepper';
import { Modal } from '../molecules/Modal';
import { TextField } from '../molecules/TextField';
import type { Customer } from '../../domain/customer/customer.entity';
import type { CartItem } from '../hooks/usePdvController';

interface CartProps {
  cart: CartItem[];
  total: number;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  ticket: string;
  onTicketChange: (value: string) => void;
  matchedCustomer: Customer | null;
  customerSuggestions: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onSetObservation: (cartId: string, observation: string) => void;
  onFinalize: () => void;
}

function itemUnitTotal(item: CartItem): number {
  return item.salePrice + (item.customizationTotal || 0);
}

export function Cart({
  cart,
  total,
  customerName,
  onCustomerNameChange,
  phone,
  onPhoneChange,
  address,
  onAddressChange,
  ticket,
  onTicketChange,
  matchedCustomer,
  customerSuggestions,
  onSelectCustomer,
  onUpdateQty,
  onRemoveItem,
  onSetObservation,
  onFinalize,
}: CartProps) {
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

  return (
    <div className="flex w-full flex-col rounded-lg border border-border bg-surface-2 md:max-h-[calc(100dvh-3rem)] md:w-[340px]">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-bold">Carrinho</h2>
      </div>

      <div className="flex flex-col gap-2 border-b border-border px-5 py-3">
        <div className="relative">
          <TextField
            type="tel"
            aria-label="Telefone do cliente"
            placeholder="Telefone do cliente"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
          />
          {customerSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-0.5 overflow-hidden rounded-md border border-border bg-surface-2 shadow-lg">
              {customerSuggestions.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="flex w-full justify-between px-3 py-2 text-left hover:bg-surface-inset"
                  onClick={() => onSelectCustomer(customer)}
                >
                  <span>{customer.name}</span>
                  <span className="text-sm text-ink-tertiary">
                    {customer.phone}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <TextField
          type="text"
          aria-label="Nome do cliente (opcional)"
          placeholder="Nome do cliente (opcional)"
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
        />
        {matchedCustomer && matchedCustomer.addresses.length > 0 ? (
          <select
            aria-label="Endereco do cliente"
            className="min-h-[38px] w-full rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
          >
            <option value="">Sem endereco</option>
            {matchedCustomer.addresses.map((entry, index) => (
              <option key={index} value={entry}>
                {entry}
              </option>
            ))}
            <option value="__new__">+ Novo endereco</option>
          </select>
        ) : null}
        {(!matchedCustomer || address === '__new__') && (
          <TextField
            type="text"
            aria-label="Endereco (opcional)"
            placeholder="Endereco (opcional)"
            value={address === '__new__' ? '' : address}
            onChange={(event) => onAddressChange(event.target.value)}
          />
        )}
        <TextField
          type="text"
          aria-label="Comanda / Mesa"
          placeholder="Comanda / Mesa"
          value={ticket}
          onChange={(event) => onTicketChange(event.target.value)}
        />
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
              {item.customizations &&
                item.customizations.map((customization, index) => (
                  <div key={index} className="mb-1 flex flex-wrap gap-1">
                    {customization.items.map((ci, ciIndex) => (
                      <span
                        key={ciIndex}
                        className="rounded-full bg-surface-inset px-1.5 py-px text-xs text-ink-tertiary"
                      >
                        {ci.qty > 1 ? ci.qty + 'x ' : ''}
                        {ci.name}
                      </span>
                    ))}
                  </div>
                ))}
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
                  aria-label="Anotacao"
                  title="Anotacao"
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

      {cart.length > 0 && (
        <div className="border-t border-border-emphasis px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <Money
              value={total}
              className="text-xl font-extrabold text-accent"
            />
          </div>
          <Button fullWidth onClick={onFinalize}>
            Finalizar Venda
          </Button>
        </div>
      )}

      {editingObsId && (
        <Modal
          open
          onClose={() => setEditingObsId(null)}
          title="Anotacao do Item"
        >
          <textarea
            aria-label="Anotacao do item"
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
