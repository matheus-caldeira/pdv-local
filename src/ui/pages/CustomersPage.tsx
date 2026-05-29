import { useMemo, useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Modal } from '../molecules/Modal';
import { SearchField } from '../molecules/SearchField';
import { FormField } from '../molecules/FormField';
import { TextField } from '../molecules/TextField';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer } from '../../domain/customer/customer.entity';

interface FormState {
  id?: number;
  name: string;
  phone: string;
  addresses: string[];
}

const EMPTY_CUSTOMER: FormState = {
  name: '',
  phone: '',
  addresses: [],
};

export function CustomersPage() {
  const { customers, saveCustomer, removeCustomer } = useCustomers();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FormState>(EMPTY_CUSTOMER);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(term) || c.phone.includes(term),
    );
  }, [customers, search]);

  function openNew() {
    setEditing({ ...EMPTY_CUSTOMER, addresses: [] });
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing({
      id: c.id,
      name: c.name,
      phone: c.phone,
      addresses: [...c.addresses],
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const ok = await saveCustomer(
      {
        name: editing.name,
        phone: editing.phone,
        addresses: editing.addresses,
      },
      editing.id,
    );
    if (ok) setModalOpen(false);
  }

  async function handleRemove(id: number) {
    if (!window.confirm('Excluir este cliente?')) return;
    const ok = await removeCustomer(id);
    if (ok) setModalOpen(false);
  }

  function updateAddress(index: number, value: string) {
    setEditing((p) => {
      const addresses = [...p.addresses];
      addresses[index] = value;
      return { ...p, addresses };
    });
  }

  function removeAddress(index: number) {
    setEditing((p) => ({
      ...p,
      addresses: p.addresses.filter((_, j) => j !== index),
    }));
  }

  function addAddress() {
    setEditing((p) => ({ ...p, addresses: [...p.addresses, ''] }));
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Clientes</h1>
        <Button onClick={openNew}>
          <Plus size={18} /> Novo Cliente
        </Button>
      </div>

      <div className="mb-4">
        <SearchField
          aria-label="Buscar clientes"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-ink-tertiary">
          <Users size={32} />
          <p>Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openEdit(c)}
              className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-surface-inset"
            >
              <div className="min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-ink-tertiary">{c.phone}</div>
              </div>
              <div className="text-sm text-ink-tertiary">
                {c.addresses.length}{' '}
                {c.addresses.length === 1 ? 'endereco' : 'enderecos'}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing.id ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Nome">
            <TextField
              value={editing.name}
              onChange={(e) =>
                setEditing((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Consumidor"
            />
          </FormField>
          <FormField label="Telefone">
            <TextField
              type="tel"
              value={editing.phone}
              onChange={(e) =>
                setEditing((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="(00) 00000-0000"
            />
          </FormField>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ink-secondary">
              Enderecos
            </span>
            {editing.addresses.map((addr, i) => (
              <div key={i} className="flex items-center gap-2">
                <TextField
                  aria-label={`Endereco ${i + 1}`}
                  value={addr}
                  onChange={(e) => updateAddress(i, e.target.value)}
                  placeholder="Rua, numero, bairro..."
                />
                <IconButton
                  aria-label={`Remover endereco ${i + 1}`}
                  onClick={() => removeAddress(i)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={addAddress}
            >
              <Plus size={14} /> Adicionar endereco
            </Button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {editing.id !== undefined && (
            <Button variant="danger" onClick={() => handleRemove(editing.id!)}>
              Excluir
            </Button>
          )}
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
