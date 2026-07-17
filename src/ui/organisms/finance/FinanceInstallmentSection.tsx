import { useState } from 'react';
import { Trash2 } from 'lucide-react';
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
  InstallmentPlan,
  MonthKey,
} from '../../../domain/finance/finance.entity';
import type { InstallmentPreviewLine } from '../../../application/finance/automations.usecases';
import type { InstallmentPlanInput } from '../../hooks/useFinanceAutomations';

interface FinanceInstallmentSectionProps {
  plans: InstallmentPlan[];
  categories: FinanceCategory[];
  members: FamilyMember[];
  currentMonth: MonthKey;
  onPreview(
    total: number,
    count: number,
    firstMonth: MonthKey,
  ): InstallmentPreviewLine[] | null;
  onCreate(input: InstallmentPlanInput): Promise<boolean>;
  onDelete(uid: string): Promise<boolean>;
}

export function FinanceInstallmentSection({
  plans,
  categories,
  members,
  currentMonth,
  onPreview,
  onCreate,
  onDelete,
}: FinanceInstallmentSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [count, setCount] = useState('2');
  const [firstMonth, setFirstMonth] = useState(currentMonth);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [categoryUid, setCategoryUid] = useState('');
  const [memberUids, setMemberUids] = useState<string[]>([]);
  const [previewLines, setPreviewLines] = useState<
    InstallmentPreviewLine[] | null
  >(null);
  const [deletingPlan, setDeletingPlan] = useState<InstallmentPlan | null>(
    null,
  );

  const visibleCategories = selectableCategories(categories, [categoryUid]);
  const visibleMembers = selectableMembers(members, memberUids);

  function openCreate() {
    setDescription('');
    setTotal('');
    setCount('2');
    setFirstMonth(currentMonth);
    setDayOfMonth('1');
    setKind('expense');
    setCategoryUid('');
    setMemberUids([]);
    setPreviewLines(null);
    setFormOpen(true);
  }

  function changeTotal(value: string) {
    setTotal(value);
    setPreviewLines(null);
  }

  function changeCount(value: string) {
    setCount(value);
    setPreviewLines(null);
  }

  function changeFirstMonth(value: string) {
    setFirstMonth(value);
    setPreviewLines(null);
  }

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

  function handlePreview() {
    setPreviewLines(
      onPreview(parseFloat(total) || 0, parseInt(count, 10) || 0, firstMonth),
    );
  }

  async function handleCreate() {
    const ok = await onCreate({
      description,
      totalAmount: parseFloat(total) || 0,
      installmentCount: parseInt(count, 10) || 0,
      firstMonth,
      dayOfMonth: parseInt(dayOfMonth, 10) || 0,
      kind,
      categoryUid,
      memberUids,
    });
    if (ok) setFormOpen(false);
  }

  async function handleDelete() {
    const ok = await onDelete(deletingPlan!.uid);
    if (ok) setDeletingPlan(null);
  }

  return (
    <section aria-label="Parcelados" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Parcelados</h2>
        <Button size="sm" onClick={openCreate}>
          Novo parcelamento
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-ink-tertiary">
          Nenhum parcelamento cadastrado.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {plans.map((plan) => (
            <li
              key={plan.uid}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <span className="text-sm font-semibold text-ink-primary">
                  {plan.description}
                </span>
                <div className="text-xs text-ink-tertiary">
                  {plan.installmentCount}x a partir de{' '}
                  {monthLabel(plan.firstMonth)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Money value={plan.totalAmount} className="font-bold" />
                <IconButton
                  tone="danger"
                  aria-label={`Excluir parcelamento ${plan.description}`}
                  onClick={() => setDeletingPlan(plan)}
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
        title="Novo parcelamento"
      >
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Descrição">
            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Geladeira"
            />
          </FormField>
          <FormField label="Valor total (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={total}
              onChange={(e) => changeTotal(e.target.value)}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Número de parcelas">
            <TextField
              type="number"
              inputMode="numeric"
              min={2}
              value={count}
              onChange={(e) => changeCount(e.target.value)}
            />
          </FormField>
          <FormField label="Primeiro mês">
            <TextField
              type="month"
              value={firstMonth}
              onChange={(e) => changeFirstMonth(e.target.value)}
            />
          </FormField>
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
        </div>

        {previewLines !== null && (
          <div className="mt-4 flex flex-col gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
              Prévia das parcelas
            </h3>
            <ul className="flex flex-col gap-1">
              {previewLines.map((line, index) => (
                <li
                  key={line.month}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-inset px-3 py-2 text-sm"
                >
                  <span className="text-ink-secondary">
                    {index + 1}. {monthLabel(line.month)}
                  </span>
                  <Money value={line.amount} className="font-bold" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="ghost" fullWidth onClick={handlePreview}>
            Ver prévia
          </Button>
          {previewLines !== null && (
            <Button
              fullWidth
              disabled={categoryUid === '' || memberUids.length === 0}
              onClick={handleCreate}
            >
              Confirmar parcelamento
            </Button>
          )}
        </div>
      </Modal>

      <Modal
        open={deletingPlan !== null}
        onClose={() => setDeletingPlan(null)}
        title="Excluir parcelamento"
      >
        <p className="mb-4 text-sm text-ink-secondary">
          As parcelas pendentes de meses abertos serão removidas. Parcelas pagas
          ou de meses fechados serão mantidas.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setDeletingPlan(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Excluir
          </Button>
        </div>
      </Modal>
    </section>
  );
}
