import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { FormField } from '../../molecules/FormField';
import { Modal } from '../../molecules/Modal';
import { Select } from '../../molecules/Select';
import { TextField } from '../../molecules/TextField';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import type {
  PaymentMethod,
  PaymentMethodType,
} from '../../../domain/finance/payment-method.entity';

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferência',
  other: 'Outro',
};

const TYPE_OPTIONS: PaymentMethodType[] = [
  'cash',
  'pix',
  'debit',
  'credit',
  'transfer',
  'other',
];

interface DraftState {
  editing: PaymentMethod | null;
  name: string;
  type: PaymentMethodType;
  closingDay: string;
  dueDay: string;
}

const EMPTY_DRAFT: DraftState = {
  editing: null,
  name: '',
  type: 'cash',
  closingDay: '',
  dueDay: '',
};

function dayToField(day: number | null): string {
  return day === null ? '' : String(day);
}

function draftFromMethod(method: PaymentMethod): DraftState {
  return {
    editing: method,
    name: method.name,
    type: method.type,
    closingDay: dayToField(method.closingDay),
    dueDay: dayToField(method.dueDay),
  };
}

function inputFromDraft(draft: DraftState) {
  const isCredit = draft.type === 'credit';
  return {
    name: draft.name.trim(),
    type: draft.type,
    closingDay: isCredit ? Number(draft.closingDay) : null,
    dueDay: isCredit ? Number(draft.dueDay) : null,
  };
}

function isDraftValid(draft: DraftState): boolean {
  if (draft.name.trim() === '') return false;
  if (draft.type !== 'credit') return true;
  return draft.closingDay.trim() !== '' && draft.dueDay.trim() !== '';
}

interface MethodDraftFormProps {
  draft: DraftState;
  onPatch: (patch: Partial<DraftState>) => void;
  onSave: (draft: DraftState) => void;
}

function MethodDraftForm({ draft, onPatch, onSave }: MethodDraftFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <FormField label="Nome">
        <TextField
          value={draft.name}
          onChange={(event) => onPatch({ name: event.target.value })}
          placeholder="Ex: Nubank"
        />
      </FormField>
      <FormField label="Tipo">
        <Select
          value={draft.type}
          onChange={(event) =>
            onPatch({ type: event.target.value as PaymentMethodType })
          }
        >
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </FormField>
      {draft.type === 'credit' && (
        <div className="flex gap-3">
          <FormField label="Dia de fechamento" className="flex-1">
            <TextField
              type="number"
              min={1}
              max={31}
              value={draft.closingDay}
              onChange={(event) => onPatch({ closingDay: event.target.value })}
            />
          </FormField>
          <FormField label="Dia de vencimento" className="flex-1">
            <TextField
              type="number"
              min={1}
              max={31}
              value={draft.dueDay}
              onChange={(event) => onPatch({ dueDay: event.target.value })}
            />
          </FormField>
        </div>
      )}
      <Button
        fullWidth
        disabled={!isDraftValid(draft)}
        onClick={() => onSave(draft)}
      >
        Salvar
      </Button>
    </div>
  );
}

export function FinancePaymentMethodManager() {
  const { methods, createMethod, updateMethod, archiveMethod } =
    usePaymentMethods();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = methods.filter((method) => !method.archived);
  const archived = methods.filter((method) => method.archived);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
  }

  function openEdit(method: PaymentMethod) {
    setDraft(draftFromMethod(method));
  }

  function patchDraft(patch: Partial<DraftState>) {
    setDraft((current) => ({ ...current!, ...patch }));
  }

  async function handleCreate(current: DraftState) {
    const ok = await createMethod(inputFromDraft(current));
    if (ok) setDraft(null);
  }

  async function handleUpdate(uid: string, current: DraftState) {
    const ok = await updateMethod(uid, inputFromDraft(current));
    if (ok) setDraft(null);
  }

  function handleSave(current: DraftState) {
    if (current.editing) {
      handleUpdate(current.editing.uid, current);
      return;
    }
    handleCreate(current);
  }

  async function handleArchive(method: PaymentMethod) {
    if (!window.confirm(`Remover o meio de pagamento "${method.name}"?`))
      return;
    await archiveMethod(method.uid);
  }

  function renderRow(method: PaymentMethod) {
    return (
      <li
        key={method.uid}
        className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-4 py-2"
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-ink-primary">
            {method.name}
          </span>
          <span className="text-xs text-ink-tertiary">
            {TYPE_LABELS[method.type]}
            {method.type === 'credit' &&
              method.closingDay !== null &&
              method.dueDay !== null &&
              ` · fecha dia ${method.closingDay} · vence dia ${method.dueDay}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {method.archived && <Badge tone="warning">arquivado</Badge>}
          {!method.archived && (
            <>
              <IconButton
                aria-label={`Editar ${method.name}`}
                onClick={() => openEdit(method)}
              >
                <Pencil size={16} />
              </IconButton>
              <IconButton
                tone="danger"
                aria-label={`Remover ${method.name}`}
                onClick={() => handleArchive(method)}
              >
                <Trash2 size={16} />
              </IconButton>
            </>
          )}
        </div>
      </li>
    );
  }

  return (
    <section
      aria-labelledby="finance-payment-methods-title"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="finance-payment-methods-title"
          className="text-lg font-bold tracking-tight"
        >
          Meios de pagamento
        </h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} /> Adicionar meio de pagamento
        </Button>
      </div>

      {active.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-tertiary">
          Nenhum meio de pagamento cadastrado.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">{active.map(renderRow)}</ul>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="cursor-pointer self-start text-xs font-semibold text-ink-tertiary underline-offset-2 hover:underline"
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived
              ? 'Ocultar arquivados'
              : `Mostrar arquivados (${archived.length})`}
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-1">{archived.map(renderRow)}</ul>
          )}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={
          draft && draft.editing
            ? 'Editar meio de pagamento'
            : 'Novo meio de pagamento'
        }
      >
        {draft && (
          <MethodDraftForm
            draft={draft}
            onPatch={patchDraft}
            onSave={handleSave}
          />
        )}
      </Modal>
    </section>
  );
}
