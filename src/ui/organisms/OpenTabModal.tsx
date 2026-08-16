import { useState } from 'react';
import { Button } from '../atoms/Button';
import { FormField } from '../molecules/FormField';
import { Modal } from '../molecules/Modal';
import { TextField } from '../molecules/TextField';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { useTabs } from '../hooks/useTabs';
import { useTicketSuggestion } from '../hooks/useTicketSuggestion';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';

const SECTION_LABELS: Record<string, string> = {
  lobinho: 'Lobinho',
  escoteiro: 'Escoteiro',
  senior: 'Sênior',
  pioneiro: 'Pioneiro',
};

interface OpenTabModalProps {
  open: boolean;
  sessionUid: string;
  onClose: () => void;
  onOpened: (order: Order) => void;
}

export function OpenTabModal({
  open,
  sessionUid,
  onClose,
  onOpened,
}: OpenTabModalProps) {
  const { openTab, openTabs } = useTabs(sessionUid);
  const { suggestions, searchByName, clearByName } = useCustomerSearch();
  const { suggestion } = useTicketSuggestion();

  const [name, setName] = useState('');
  const [ticketOverride, setTicketOverride] = useState<string | null>(null);
  const [error, setError] = useState('');

  const ticket = ticketOverride ?? suggestion;

  function handleTicketChange(value: string) {
    setTicketOverride(value);
  }

  function handleNameChange(value: string) {
    setName(value);
    setError('');
    void searchByName(value);
  }

  function handleSelectSuggestion(customer: Customer) {
    const sectionLabel = SECTION_LABELS[customer.extra.section ?? ''];
    setName(
      sectionLabel ? `${customer.name} (${sectionLabel})` : customer.name,
    );
    clearByName();
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe o nome para a comanda.');
      return;
    }
    const openedTicket = ticket.trim() || suggestion;
    const ok = await openTab(trimmed, openedTicket);
    if (!ok) return;
    const opened = openTabs.find((tab) => tab.ticket === openedTicket);
    handleClose();
    if (opened) onOpened(opened);
  }

  function handleClose() {
    setName('');
    setTicketOverride(null);
    setError('');
    clearByName();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Abrir comanda">
      <div className="flex flex-col gap-3">
        <FormField label="Comanda">
          <TextField
            className="font-mono tabular-nums"
            value={ticket}
            onChange={(event) => handleTicketChange(event.target.value)}
          />
        </FormField>

        <div className="relative">
          <FormField label="Nome">
            <TextField
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Nome de quem vai consumir"
            />
          </FormField>

          {suggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label="Sugestões de cliente"
              className="absolute left-0 right-0 top-full z-20 mt-0.5 overflow-hidden rounded-md border border-border bg-surface-2 shadow-lg"
            >
              {suggestions.map((customer) => {
                const sectionLabel =
                  SECTION_LABELS[customer.extra.section ?? ''];
                const guardian = customer.extra.guardian;
                return (
                  <li key={customer.uid} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-inset"
                      onClick={() => handleSelectSuggestion(customer)}
                    >
                      <span className="font-semibold text-ink-primary">
                        {customer.name}
                        {sectionLabel && (
                          <span className="ml-2 text-sm font-normal text-ink-tertiary">
                            {sectionLabel}
                          </span>
                        )}
                      </span>
                      {guardian && (
                        <span className="text-xs text-ink-tertiary">
                          Resp.: {guardian}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && <span className="text-sm text-danger">{error}</span>}

        <Button fullWidth onClick={handleSubmit}>
          Abrir comanda
        </Button>
      </div>
    </Modal>
  );
}
