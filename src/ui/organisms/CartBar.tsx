import { useState } from 'react';
import {
  ChevronUp,
  CreditCard,
  MoreVertical,
  Receipt,
  User,
} from 'lucide-react';
import { IconButton } from '../atoms/IconButton';
import { Money } from '../atoms/Money';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import type { Order } from '../../domain/order/order.entity';
import type { BusinessTypeRules } from '../../domain/business-type/business-type.entity';
import type { CartItem } from '../hooks/usePdvController';

interface CartBarProps {
  cart: CartItem[];
  total: number;
  customerName: string;
  ordering?: BusinessTypeRules['ordering'];
  selectedTab?: Order | null;
  onExpand: () => void;
  onOpenCustomer: () => void;
  onOpenTab: () => void;
  onFinalize: () => void;
  onCreateCustomer: () => void;
  onClearCart: () => void;
}

export function CartBar({
  cart,
  total,
  customerName,
  ordering = 'optional',
  selectedTab,
  onExpand,
  onOpenCustomer,
  onOpenTab,
  onFinalize,
  onCreateCustomer,
  onClearCart,
}: CartBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const hasItems = itemCount > 0;
  const hasCustomer = Boolean(customerName.trim());

  function runAndClose(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <div
      data-testid="cart-bar"
      className="fixed inset-x-0 bottom-[calc(var(--nav-bottom-height)+env(safe-area-inset-bottom,0px))] z-[110] border-t border-border-emphasis bg-surface-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 pt-3 text-left"
        onClick={onExpand}
        disabled={!hasItems}
      >
        <span className="text-sm font-semibold text-ink-secondary">
          {hasItems
            ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
            : 'Nenhum item'}
        </span>
        <span className="flex items-center gap-1">
          {hasItems && (
            <Money
              value={total}
              className="font-mono text-lg font-extrabold tabular-nums text-accent"
            />
          )}
          {hasItems && <ChevronUp size={16} className="text-ink-tertiary" />}
        </span>
      </button>

      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <IconButton size="md" aria-label="Cliente" onClick={onOpenCustomer}>
            <User size={18} />
          </IconButton>
          {ordering !== 'none' && (
            <IconButton
              size="md"
              aria-label={
                selectedTab
                  ? `Lançar na comanda nº ${selectedTab.ticket}`
                  : 'Abrir comanda'
              }
              disabled={selectedTab ? !hasItems : !hasCustomer}
              onClick={onOpenTab}
            >
              <Receipt size={18} />
            </IconButton>
          )}
          <IconButton
            size="md"
            aria-label="Finalizar venda"
            disabled={!hasItems}
            onClick={onFinalize}
          >
            <CreditCard size={18} />
          </IconButton>
        </div>

        <IconButton
          size="md"
          aria-label="Mais ações"
          onClick={() => setMenuOpen(true)}
        >
          <MoreVertical size={18} />
        </IconButton>
      </div>

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Mais ações"
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => runAndClose(onCreateCustomer)}
          >
            Cadastrar cliente
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!hasItems}
            onClick={() => runAndClose(onClearCart)}
          >
            Limpar carrinho
          </Button>
        </div>
      </Modal>
    </div>
  );
}
