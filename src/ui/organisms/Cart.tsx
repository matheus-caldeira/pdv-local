import { Plus } from 'lucide-react';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Money } from '../atoms/Money';
import { Autocomplete } from '../molecules/Autocomplete';
import { CartItemList } from '../molecules/CartItemList';
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
  ordering?: BusinessTypeRules['ordering'];
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onSetObservation: (cartId: string, observation: string) => void;
  onFinalize: () => void;
  selectedTab?: Order | null;
  onLaunchToTab?: () => void;
  onOpenNewTab: () => void;
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
  ordering = 'optional',
  onUpdateQty,
  onRemoveItem,
  onSetObservation,
  onFinalize,
  selectedTab,
  onLaunchToTab,
  onOpenNewTab,
}: CartProps) {
  const suggestionByUid = new Map(
    customerSuggestions.map((entry) => [entry.uid, entry]),
  );

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
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <CartItemList
          cart={cart}
          onUpdateQty={onUpdateQty}
          onRemoveItem={onRemoveItem}
          onSetObservation={onSetObservation}
        />
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
            <>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                disabled={!customerName.trim()}
                title={
                  customerName.trim() ? undefined : 'Informe o cliente primeiro'
                }
                className={cart.length > 0 ? 'mt-2' : undefined}
                onClick={onOpenNewTab}
              >
                <Plus size={14} /> Nova comanda
              </Button>
              {!customerName.trim() && (
                <span className="mt-1 block text-center text-xs text-ink-tertiary">
                  Informe o cliente para abrir uma comanda
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
