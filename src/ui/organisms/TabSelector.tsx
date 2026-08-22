import { useState } from 'react';
import {
  Autocomplete,
  type AutocompleteOption,
} from '../molecules/Autocomplete';
import type { Order } from '../../domain/order/order.entity';

interface TabSelectorProps {
  tabs: Order[];
  selectedUid: string | null;
  onSelect: (uid: string | null) => void;
}

function tabLabel(tab: Order): string {
  return `${tab.ticket} — ${tab.customerName}`;
}

export function TabSelector({ tabs, selectedUid, onSelect }: TabSelectorProps) {
  const selected = tabs.find((tab) => tab.uid === selectedUid) ?? null;
  const [term, setTerm] = useState(() => (selected ? tabLabel(selected) : ''));
  const [lastSelected, setLastSelected] = useState(selected);

  if (selected !== lastSelected) {
    setLastSelected(selected);
    setTerm(selected ? tabLabel(selected) : '');
  }

  if (tabs.length === 0) {
    return (
      <div className="flex min-h-[44px] items-center text-sm text-ink-tertiary">
        Nenhuma comanda aberta
      </div>
    );
  }

  const query = term.trim().toLowerCase();
  const options: AutocompleteOption[] =
    selected && term === tabLabel(selected)
      ? []
      : tabs
          .filter(
            (tab) =>
              !query ||
              tab.ticket.toLowerCase().includes(query) ||
              tab.customerName.toLowerCase().includes(query),
          )
          .map((tab) => ({
            value: tab.uid,
            label: tab.customerName,
            hint: tab.ticket,
          }));

  function handleChange(value: string) {
    setTerm(value);
    if (!value.trim()) onSelect(null);
  }

  return (
    <Autocomplete
      label="Comanda"
      placeholder="Número ou nome"
      value={term}
      options={options}
      onChange={handleChange}
      onSelect={(option) => onSelect(option.value)}
    />
  );
}
