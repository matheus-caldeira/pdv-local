import { Button } from '../atoms/Button';
import { FormField } from '../molecules/FormField';
import { Select } from '../molecules/Select';
import type { Order } from '../../domain/order/order.entity';

interface TabSelectorProps {
  tabs: Order[];
  selectedUid: string | null;
  onSelect: (uid: string | null) => void;
  onOpenNew: () => void;
}

export function TabSelector({
  tabs,
  selectedUid,
  onSelect,
  onOpenNew,
}: TabSelectorProps) {
  return (
    <div className="flex items-end gap-2">
      <FormField label="Comanda" className="flex-1">
        {tabs.length === 0 ? (
          <div className="flex min-h-[44px] items-center text-sm text-ink-tertiary">
            Nenhuma comanda aberta
          </div>
        ) : (
          <Select
            value={selectedUid ?? ''}
            onChange={(event) => onSelect(event.target.value || null)}
          >
            <option value="">Venda avulsa</option>
            {tabs.map((tab) => (
              <option key={tab.uid} value={tab.uid}>
                {tab.ticket} — {tab.customerName}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <Button variant="ghost" onClick={onOpenNew}>
        Nova comanda
      </Button>
    </div>
  );
}
