import { useState } from 'react';
import { Button } from '../atoms/Button';
import { FormField } from '../molecules/FormField';
import { Modal } from '../molecules/Modal';
import { TextField } from '../molecules/TextField';
import { ExtraFields } from '../molecules/ExtraFields';
import { useActiveBusinessType } from '../hooks/useActiveBusinessType';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Customer } from '../../domain/customer/customer.entity';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';

interface QuickCustomerModalProps {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

export function QuickCustomerModal({
  open,
  initialName,
  onClose,
  onCreated,
}: QuickCustomerModalProps) {
  const { definition } = useActiveBusinessType();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initialName);
      setPhone('');
      setExtra({});
      setError('');
    }
  }

  async function handleSubmit(active: BusinessTypeDefinition) {
    setError('');
    const result = await container.saveCustomer(
      { name, phone, addresses: [], extra },
      active,
    );
    fold(
      result,
      (failure) => setError(failure.message),
      (created) => onCreated(created),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo cliente">
      <div className="flex flex-col gap-3">
        <FormField label="Nome">
          <TextField
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do cliente"
          />
        </FormField>

        <FormField label="Telefone">
          <TextField
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(00) 00000-0000"
          />
        </FormField>

        {definition && (
          <ExtraFields
            businessTypeId={definition.id}
            scope="customer"
            value={extra}
            onChange={setExtra}
          />
        )}

        {error && <span className="text-sm text-danger">{error}</span>}

        <Button
          fullWidth
          disabled={!definition}
          onClick={definition ? () => handleSubmit(definition) : undefined}
        >
          Cadastrar
        </Button>
      </div>
    </Modal>
  );
}
