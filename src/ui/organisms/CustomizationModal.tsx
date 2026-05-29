import { useMemo, useState } from 'react';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { QtyStepper } from '../atoms/QtyStepper';
import { useToast } from '../molecules/toast-context';
import {
  calculateCustomizationTotal,
  validateRequiredCustomizations,
} from '../../domain/order/order.rules';
import { fold } from '../../domain/shared/either';
import type {
  OrderItem,
  OrderCustomization,
} from '../../domain/order/order.entity';
import type { Product } from '../../domain/product/product.entity';
import type { LoadedCustomizationGroup } from '../hooks/useCustomizationLoader';
import type { CustomizationItem } from '../../infrastructure/dexie/dexie-database';

interface CustomizationModalProps {
  product: Product;
  groups: LoadedCustomizationGroup[];
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
}

type Selections = Record<number, Record<number, number>>;

export function CustomizationModal({
  product,
  groups,
  onClose,
  onConfirm,
}: CustomizationModalProps) {
  const toast = useToast();
  const [selections, setSelections] = useState<Selections>({});
  const [observation, setObservation] = useState('');

  const extra = useMemo(
    () =>
      calculateCustomizationTotal(
        groups.map((group) => ({
          required: group.required,
          minQty: group.minQty,
          chargeAfter: group.chargeAfter,
          items: group.items.map((item) => ({
            qty: selections[group.id!]?.[item.id!] || 0,
            price: item.price,
            chargeAfter: item.chargeAfter,
          })),
        })),
      ),
    [groups, selections],
  );

  function updateSelection(
    group: LoadedCustomizationGroup,
    item: CustomizationItem,
    delta: number,
  ) {
    const groupId = group.id!;
    const itemId = item.id!;
    setSelections((prev) => {
      const groupSel = { ...(prev[groupId] || {}) };
      groupSel[itemId] = Math.max(0, (groupSel[itemId] || 0) + delta);
      return { ...prev, [groupId]: groupSel };
    });
  }

  function confirm() {
    const validation = validateRequiredCustomizations(
      groups.map((group) => {
        const sel = selections[group.id!] || {};
        return {
          name: group.name,
          required: group.required,
          minQty: group.minQty,
          selectedQty: Object.values(sel).reduce((s, q) => s + q, 0),
        };
      }),
    );

    const proceed = fold(
      validation,
      (error) => {
        toast(error.message, 'error');
        return false;
      },
      () => true,
    );
    if (!proceed) return;

    const customizations: OrderCustomization[] = [];
    for (const group of groups) {
      const sel = selections[group.id!] || {};
      const items = Object.entries(sel)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = group.items.find((i) => i.id === Number(itemId))!;
          return { name: item.name, qty, price: item.price };
        });
      if (items.length > 0) {
        customizations.push({ groupName: group.name, items });
      }
    }

    onConfirm({
      productId: product.id!,
      name: product.name,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      qty: 1,
      observation: observation.trim() || undefined,
      customizations: customizations.length > 0 ? customizations : undefined,
      customizationTotal: extra > 0 ? extra : undefined,
    });
  }

  return (
    <Modal open onClose={onClose} title={product.name}>
      <div>
        <Money
          value={product.salePrice}
          className="mb-4 block text-center text-xl font-extrabold text-accent"
        />

        {groups.map((group) => {
          const groupSel = selections[group.id!] || {};
          const totalSelected = Object.values(groupSel).reduce(
            (s, q) => s + q,
            0,
          );
          return (
            <div key={group.id} className="mb-4">
              <div className="mb-2 flex items-start justify-between rounded-sm bg-surface-inset px-3 py-2">
                <div>
                  <span className="block text-sm font-bold">{group.name}</span>
                  <span className="mt-px block text-xs text-ink-tertiary">
                    {group.required ? 'Obrigatorio' : 'Opcional'} ·{' '}
                    {group.minQty}-{group.maxQty}
                    {group.chargeAfter > 0 && ` · ${group.chargeAfter} gratis`}
                  </span>
                </div>
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-ink-secondary">
                  {totalSelected}/{group.maxQty}
                </span>
              </div>
              {group.items.map((item) => {
                const qty = groupSel[item.id!] || 0;
                const incDisabled =
                  totalSelected >= group.maxQty ||
                  (item.maxQty > 0 && qty >= item.maxQty);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.price > 0 && (
                        <span className="block font-mono text-xs tabular-nums text-accent">
                          + <Money value={item.price} className="text-accent" />
                          {item.chargeAfter > 0 && (
                            <span className="font-normal text-ink-tertiary">
                              {' '}
                              ({item.chargeAfter} gratis)
                            </span>
                          )}
                        </span>
                      )}
                      {(item.maxQty || 0) > 0 && (
                        <span className="block text-xs text-ink-tertiary">
                          max {item.maxQty}
                        </span>
                      )}
                    </div>
                    <QtyStepper
                      size="sm"
                      hideZero
                      qty={qty}
                      onDecrement={() => updateSelection(group, item, -1)}
                      onIncrement={() => updateSelection(group, item, 1)}
                      incrementDisabled={incDisabled}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="mt-3">
          <label
            htmlFor="customization-observation"
            className="mb-1 block text-xs font-semibold text-ink-secondary"
          >
            Observacao
          </label>
          <textarea
            id="customization-observation"
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Ex: Sem cebola, ponto da carne..."
            rows={2}
            className="w-full resize-y rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
          />
        </div>

        {extra > 0 && (
          <div className="py-2 text-center text-sm font-semibold text-accent">
            Adicionais: + <Money value={extra} className="text-accent" />
          </div>
        )}

        <Button fullWidth className="mt-3" onClick={confirm}>
          Adicionar ·{' '}
          <Money
            value={product.salePrice + extra}
            className="text-accent-text"
          />
        </Button>
      </div>
    </Modal>
  );
}
