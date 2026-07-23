import { useState } from 'react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Modal } from '../../molecules/Modal';
import { FormField } from '../../molecules/FormField';
import { Select } from '../../molecules/Select';
import { TextField } from '../../molecules/TextField';
import type { EntryInput } from '../../../application/finance/entries.usecases';
import { resolveInvoiceMonth } from '../../../domain/finance/invoice.rules';
import { formatDate } from '../../../domain/shared/format';
import type {
  EntryStatus,
  FamilyMember,
  FinanceCategory,
  FinanceEntry,
} from '../../../domain/finance/finance.entity';
import type { PaymentMethod } from '../../../domain/finance/payment-method.entity';
import { monthLabel } from './FinanceAutomationsSupport';

interface FinanceEntryFormModalProps {
  open: boolean;
  entry: FinanceEntry | null;
  categories: FinanceCategory[];
  members: FamilyMember[];
  paymentMethods: PaymentMethod[];
  onClose(): void;
  onSave(input: EntryInput): void;
  onDelete(uid: string): void;
}

interface FormState {
  description: string;
  amount: string;
  categoryUid: string;
  memberUids: string[];
  date: string;
  status: EntryStatus;
  paymentMethodUid: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateInputValue(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fromDateInputValue(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function initialForm(
  entry: FinanceEntry | null,
  members: FamilyMember[],
): FormState {
  if (entry) {
    return {
      description: entry.description,
      amount: String(entry.amount),
      categoryUid: entry.categoryUid,
      memberUids: [...entry.memberUids],
      date: toDateInputValue(entry.date),
      status: entry.status,
      paymentMethodUid: entry.paymentMethodUid ?? '',
    };
  }
  const activeMembers = members.filter((member) => !member.archived);
  return {
    description: '',
    amount: '',
    categoryUid: '',
    memberUids: activeMembers.length === 1 ? [activeMembers[0].uid] : [],
    date: toDateInputValue(Date.now()),
    status: 'pending',
    paymentMethodUid: '',
  };
}

function invoicePreviewLabel(
  method: PaymentMethod | undefined,
  dateValue: string,
): string | null {
  if (
    !method ||
    method.type !== 'credit' ||
    method.closingDay === null ||
    method.dueDay === null
  ) {
    return null;
  }
  const resolved = resolveInvoiceMonth(
    fromDateInputValue(dateValue),
    method.closingDay,
    method.dueDay,
  );
  return `Fatura de ${monthLabel(resolved.month)}, vence ${formatDate(resolved.dueDate)}`;
}

export function FinanceEntryFormModal({
  open,
  entry,
  categories,
  members,
  paymentMethods,
  onClose,
  onSave,
  onDelete,
}: FinanceEntryFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialForm(entry, members),
  );
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(initialForm(entry, members));
  }

  const dateLocked = entry !== null && entry.source !== 'manual';
  const selectableCategories = categories.filter(
    (category) => !category.archived || category.uid === form.categoryUid,
  );
  const incomeCategories = selectableCategories.filter(
    (category) => category.kind === 'income',
  );
  const expenseCategories = selectableCategories.filter(
    (category) => category.kind === 'expense',
  );
  const selectedCategoryArchived = categories.some(
    (category) => category.uid === form.categoryUid && category.archived,
  );
  const visibleMembers = members.filter(
    (member) => !member.archived || form.memberUids.includes(member.uid),
  );
  const selectablePaymentMethods = paymentMethods.filter(
    (method) => !method.archived || method.uid === form.paymentMethodUid,
  );
  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.uid === form.paymentMethodUid,
  );
  const invoicePreview = invoicePreviewLabel(selectedPaymentMethod, form.date);

  function toggleMember(uid: string) {
    setForm((previous) => ({
      ...previous,
      memberUids: previous.memberUids.includes(uid)
        ? previous.memberUids.filter((memberUid) => memberUid !== uid)
        : [...previous.memberUids, uid],
    }));
  }

  function handleSave() {
    onSave({
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      categoryUid: form.categoryUid,
      memberUids: form.memberUids,
      date: dateLocked ? entry!.date : fromDateInputValue(form.date),
      status: form.status,
      paymentMethodUid:
        form.paymentMethodUid === '' ? null : form.paymentMethodUid,
    });
  }

  function handleDelete() {
    if (!window.confirm('Excluir este lançamento?')) return;
    onDelete(entry!.uid);
  }

  function categoryOption(category: FinanceCategory) {
    return (
      <option key={category.uid} value={category.uid}>
        {category.archived ? `${category.name} (arquivada)` : category.name}
      </option>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Editar lançamento' : 'Novo lançamento'}
    >
      <div className="grid grid-cols-1 gap-3">
        <FormField label="Descrição">
          <TextField
            value={form.description}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                description: event.target.value,
              }))
            }
            placeholder="Ex: Conta de luz"
          />
        </FormField>
        <FormField label="Valor (R$)">
          <TextField
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                amount: event.target.value,
              }))
            }
            placeholder="0,00"
          />
        </FormField>
        <FormField label="Categoria">
          <Select
            value={form.categoryUid}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                categoryUid: event.target.value,
              }))
            }
          >
            <option value="">Selecione...</option>
            <optgroup label="Entradas">
              {incomeCategories.map(categoryOption)}
            </optgroup>
            <optgroup label="Saídas">
              {expenseCategories.map(categoryOption)}
            </optgroup>
          </Select>
        </FormField>
        {selectedCategoryArchived && (
          <Badge tone="muted" size="xs" className="self-start">
            Categoria arquivada
          </Badge>
        )}
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-semibold text-ink-secondary">
            Membros
          </legend>
          {visibleMembers.map((member) => (
            <label
              key={member.uid}
              className="flex items-center gap-2 text-sm text-ink-primary"
            >
              <input
                type="checkbox"
                checked={form.memberUids.includes(member.uid)}
                onChange={() => toggleMember(member.uid)}
              />
              {member.archived ? `${member.name} (arquivado)` : member.name}
            </label>
          ))}
        </fieldset>
        <FormField
          label="Data"
          hint={
            dateLocked
              ? 'A data de lançamentos gerados (parcela, recorrência ou fórmula) não pode ser alterada.'
              : undefined
          }
        >
          <TextField
            type="date"
            value={form.date}
            disabled={dateLocked}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, date: event.target.value }))
            }
          />
        </FormField>
        <FormField label="Status">
          <Select
            value={form.status}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                status: event.target.value as EntryStatus,
              }))
            }
          >
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </Select>
        </FormField>
        <FormField label="Meio de pagamento">
          <Select
            value={form.paymentMethodUid}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                paymentMethodUid: event.target.value,
              }))
            }
          >
            <option value="">Nenhum</option>
            {selectablePaymentMethods.map((method) => (
              <option key={method.uid} value={method.uid}>
                {method.archived ? `${method.name} (arquivado)` : method.name}
              </option>
            ))}
          </Select>
        </FormField>
        {invoicePreview && (
          <p className="text-sm font-semibold text-ink-secondary">
            {invoicePreview}
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {entry && (
          <Button variant="danger" onClick={handleDelete}>
            Excluir
          </Button>
        )}
        <Button onClick={handleSave}>Salvar</Button>
      </div>
    </Modal>
  );
}
