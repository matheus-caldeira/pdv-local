import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { Money } from '../../atoms/Money';
import { FormField } from '../../molecules/FormField';
import { Modal } from '../../molecules/Modal';
import { Select } from '../../molecules/Select';
import { TextField } from '../../molecules/TextField';
import {
  categoryOptions,
  KIND_OPTIONS,
  monthLabel,
} from './FinanceAutomationsSupport';
import {
  selectableCategories,
  selectableMembers,
} from './FinanceArchivedSupport';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceKind,
  MonthKey,
  Recurrence,
} from '../../../domain/finance/finance.entity';
import type { RecurrenceInput } from '../../../application/finance/automations.usecases';

interface FinanceRecurrenceSectionProps {
  recurrences: Recurrence[];
  categories: FinanceCategory[];
  members: FamilyMember[];
  currentMonth: MonthKey;
  onSave(input: RecurrenceInput): Promise<boolean>;
  onDelete(uid: string): Promise<boolean>;
  onLaunch(uid: string): Promise<boolean>;
  onLaunchAll(): Promise<boolean>;
}

function rangeLabel(recurrence: Recurrence): string {
  if (recurrence.endMonth === null) {
    return `desde ${monthLabel(recurrence.startMonth)}`;
  }
  return `${monthLabel(recurrence.startMonth)} até ${monthLabel(recurrence.endMonth)}`;
}

export function FinanceRecurrenceSection({
  recurrences,
  categories,
  members,
  currentMonth,
  onSave,
  onDelete,
  onLaunch,
  onLaunchAll,
}: FinanceRecurrenceSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [categoryUid, setCategoryUid] = useState('');
  const [memberUids, setMemberUids] = useState<string[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState('');
  const [active, setActive] = useState(true);

  function openCreate() {
    setEditingUid(null);
    setDescription('');
    setAmount('');
    setKind('expense');
    setCategoryUid('');
    setMemberUids([]);
    setDayOfMonth('1');
    setStartMonth(currentMonth);
    setEndMonth('');
    setActive(true);
    setFormOpen(true);
  }

  function openEdit(recurrence: Recurrence) {
    setEditingUid(recurrence.uid);
    setDescription(recurrence.description);
    setAmount(String(recurrence.amount));
    setKind(recurrence.kind);
    setCategoryUid(recurrence.categoryUid);
    setMemberUids([...recurrence.memberUids]);
    setDayOfMonth(String(recurrence.dayOfMonth));
    setStartMonth(recurrence.startMonth);
    setEndMonth(recurrence.endMonth ?? '');
    setActive(recurrence.active);
    setFormOpen(true);
  }

  const visibleCategories = selectableCategories(categories, [categoryUid]);
  const visibleMembers = selectableMembers(members, memberUids);

  function changeKind(next: FinanceKind) {
    setKind(next);
    setCategoryUid('');
  }

  function toggleMember(uid: string) {
    setMemberUids((prev) =>
      prev.includes(uid)
        ? prev.filter((memberUid) => memberUid !== uid)
        : [...prev, uid],
    );
  }

  async function handleSubmit() {
    const ok = await onSave({
      uid: editingUid ?? undefined,
      description,
      amount: parseFloat(amount) || 0,
      kind,
      categoryUid,
      memberUids,
      paymentMethodUid: null,
      dayOfMonth: parseInt(dayOfMonth, 10) || 0,
      startMonth,
      endMonth: endMonth === '' ? null : endMonth,
      active,
    });
    if (ok) setFormOpen(false);
  }

  function handleDelete(recurrence: Recurrence) {
    if (!window.confirm('Excluir esta recorrência?')) return;
    onDelete(recurrence.uid);
  }

  return (
    <section aria-label="Recorrências" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Recorrências</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => onLaunchAll()}>
            Lançar todas do mês
          </Button>
          <Button size="sm" onClick={openCreate}>
            Nova recorrência
          </Button>
        </div>
      </div>

      {recurrences.length === 0 ? (
        <p className="text-sm text-ink-tertiary">
          Nenhuma recorrência cadastrada.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {recurrences.map((recurrence) => (
            <li
              key={recurrence.uid}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-primary">
                    {recurrence.description}
                  </span>
                  <Badge tone={recurrence.active ? 'success' : 'muted'}>
                    {recurrence.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <div className="text-xs text-ink-tertiary">
                  Dia {recurrence.dayOfMonth} · {rangeLabel(recurrence)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Money
                  value={recurrence.amount}
                  className={
                    recurrence.kind === 'income'
                      ? 'font-bold text-success'
                      : 'font-bold text-danger'
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLaunch(recurrence.uid)}
                >
                  Lançar no mês atual
                </Button>
                <IconButton
                  aria-label={`Editar recorrência ${recurrence.description}`}
                  onClick={() => openEdit(recurrence)}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton
                  tone="danger"
                  aria-label={`Excluir recorrência ${recurrence.description}`}
                  onClick={() => handleDelete(recurrence)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingUid ? 'Editar recorrência' : 'Nova recorrência'}
      >
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Descrição">
            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel"
            />
          </FormField>
          <FormField label="Valor (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Tipo">
            <Select
              value={kind}
              onChange={(e) => changeKind(e.target.value as FinanceKind)}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Categoria">
            <Select
              value={categoryUid}
              onChange={(e) => setCategoryUid(e.target.value)}
            >
              <option value="">Selecione</option>
              {categoryOptions(visibleCategories, kind, categoryUid).map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </Select>
          </FormField>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-semibold text-ink-secondary">
              Membros
            </legend>
            <div className="flex flex-wrap gap-3">
              {visibleMembers.map((member) => (
                <label
                  key={member.uid}
                  className="flex items-center gap-1 text-sm text-ink-secondary"
                >
                  <input
                    type="checkbox"
                    checked={memberUids.includes(member.uid)}
                    onChange={() => toggleMember(member.uid)}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Dia do mês (1-28)">
            <TextField
              type="number"
              inputMode="numeric"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
          </FormField>
          <FormField label="Mês de início">
            <TextField
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </FormField>
          <FormField label="Mês de fim (opcional)">
            <TextField
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Ativa
          </label>
        </div>
        <div className="mt-4">
          <Button
            fullWidth
            disabled={categoryUid === '' || memberUids.length === 0}
            onClick={handleSubmit}
          >
            Salvar recorrência
          </Button>
        </div>
      </Modal>
    </section>
  );
}
