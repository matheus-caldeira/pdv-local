import { Plus } from 'lucide-react';
import { IconButton } from '../atoms/IconButton';
import { Autocomplete } from './Autocomplete';
import { TabSelector } from '../organisms/TabSelector';
import { customerSuggestionLabel } from '../../domain/customer/customer.rules';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';

interface CustomerPickerProps {
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerSuggestions: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: () => void;
  tabs: Order[];
  selectedTabUid: string | null;
  onSelectTab: (uid: string | null) => void;
}

export function CustomerPicker({
  customerName,
  onCustomerNameChange,
  customerSuggestions,
  onSelectCustomer,
  onCreateCustomer,
  tabs,
  selectedTabUid,
  onSelectTab,
}: CustomerPickerProps) {
  const suggestionByUid = new Map(
    customerSuggestions.map((entry) => [entry.uid, entry]),
  );

  return (
    <div className="flex flex-col gap-3">
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

      <TabSelector
        tabs={tabs}
        selectedUid={selectedTabUid}
        onSelect={onSelectTab}
      />
    </div>
  );
}
