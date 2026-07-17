import { useEffect, useState } from 'react';
import { Button } from '../../atoms/Button';
import { Money } from '../../atoms/Money';
import { FormField } from '../../molecules/FormField';
import { Modal } from '../../molecules/Modal';
import { MonthPicker } from '../../molecules/MonthPicker';
import { Select } from '../../molecules/Select';
import { addMonths } from '../../../domain/finance/finance.rules';
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
  FinanceFormula,
  FinanceKind,
  FormulaFilter,
  MonthKey,
} from '../../../domain/finance/finance.entity';
import type {
  FormulaPreview,
  FormulaPreviewInput,
  GenerateFormulaInput,
} from '../../../application/finance/automations.usecases';

interface FormulaPreviewModalProps {
  formula: FinanceFormula;
  categories: FinanceCategory[];
  members: FamilyMember[];
  currentMonth: MonthKey;
  onPreview(input: FormulaPreviewInput): Promise<FormulaPreview | null>;
  onGenerate(input: GenerateFormulaInput): Promise<boolean>;
  onClose(): void;
}

const TARGET_MONTH_SPAN = 13;

export function FormulaPreviewModal({
  formula,
  categories,
  members,
  currentMonth,
  onPreview,
  onGenerate,
  onClose,
}: FormulaPreviewModalProps) {
  const [baseMonth, setBaseMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<FormulaFilter>(() => ({
    kind: formula.filter.kind,
    categoryUids: [...formula.filter.categoryUids],
    memberUids: [...formula.filter.memberUids],
  }));
  const [preview, setPreview] = useState<FormulaPreview | null>(null);
  const [targetMonth, setTargetMonth] = useState('');

  useEffect(() => {
    let cancelled = false;
    onPreview({ formulaUid: formula.uid, baseMonth, filter }).then((result) => {
      if (cancelled) return;
      setPreview(result);
      if (result) {
        setTargetMonth((previous) =>
          previous === '' ? result.defaultTargetMonth : previous,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [formula.uid, baseMonth, filter, onPreview]);

  const visibleCategories = selectableCategories(
    categories,
    filter.categoryUids,
  );
  const visibleMembers = selectableMembers(members, filter.memberUids);

  function changeBaseMonth(month: MonthKey) {
    setBaseMonth(month);
    setTargetMonth('');
  }

  function changeFilterKind(kind: FinanceKind) {
    setFilter((prev) => ({
      kind,
      categoryUids: [],
      memberUids: prev.memberUids,
    }));
  }

  function toggleFilterCategory(uid: string) {
    setFilter((prev) => ({
      ...prev,
      categoryUids: prev.categoryUids.includes(uid)
        ? prev.categoryUids.filter((categoryUid) => categoryUid !== uid)
        : [...prev.categoryUids, uid],
    }));
  }

  function toggleFilterMember(uid: string) {
    setFilter((prev) => ({
      ...prev,
      memberUids: prev.memberUids.includes(uid)
        ? prev.memberUids.filter((memberUid) => memberUid !== uid)
        : [...prev.memberUids, uid],
    }));
  }

  async function handleGenerate() {
    const ok = await onGenerate({
      formulaUid: formula.uid,
      baseMonth,
      filter,
      targetMonth,
    });
    if (ok) onClose();
  }

  const targetOptions = Array.from({ length: TARGET_MONTH_SPAN }, (_, index) =>
    addMonths(baseMonth, index),
  );
  const targetClosed =
    preview !== null && preview.closedMonths.includes(targetMonth);

  return (
    <Modal open onClose={onClose} title={`Gerar ${formula.name}`}>
      <div className="grid grid-cols-1 gap-3">
        <FormField label="Mês-base">
          <MonthPicker value={baseMonth} onChange={changeBaseMonth} />
        </FormField>
        <FormField label="Tipo do filtro">
          <Select
            value={filter.kind}
            onChange={(e) => changeFilterKind(e.target.value as FinanceKind)}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-semibold text-ink-secondary">
            Categorias do filtro
          </legend>
          <div className="flex flex-wrap gap-3">
            {categoryOptions(visibleCategories, filter.kind, '').map(
              (option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-1 text-sm text-ink-secondary"
                >
                  <input
                    type="checkbox"
                    checked={filter.categoryUids.includes(option.value)}
                    onChange={() => toggleFilterCategory(option.value)}
                  />
                  {option.label}
                </label>
              ),
            )}
          </div>
          <span className="text-xs text-ink-tertiary">
            Nenhuma selecionada = todas
          </span>
        </fieldset>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-semibold text-ink-secondary">
            Membros do filtro
          </legend>
          <div className="flex flex-wrap gap-3">
            {visibleMembers.map((member) => (
              <label
                key={member.uid}
                className="flex items-center gap-1 text-sm text-ink-secondary"
              >
                <input
                  type="checkbox"
                  checked={filter.memberUids.includes(member.uid)}
                  onChange={() => toggleFilterMember(member.uid)}
                />
                {member.name}
              </label>
            ))}
          </div>
          <span className="text-xs text-ink-tertiary">
            Nenhum selecionado = todos
          </span>
        </fieldset>
      </div>

      {preview === null ? (
        <p className="mt-4 text-sm text-ink-tertiary">Carregando prévia…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {preview.previousGenerations.length > 0 && (
            <p
              role="alert"
              className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning"
            >
              Esta fórmula já gerou {preview.previousGenerations.length}{' '}
              lançamento(s) para este mês-base.
            </p>
          )}

          {preview.matches.length === 0 ? (
            <p className="text-sm text-ink-tertiary">
              Nenhum lançamento casa com o filtro.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {preview.matches.map((entry) => (
                <li
                  key={entry.uid}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-inset px-3 py-2 text-sm"
                >
                  <span className="text-ink-secondary">
                    {entry.description}
                  </span>
                  <Money value={entry.amount} />
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-1 rounded-md border border-border-emphasis bg-surface-inset px-3 py-2 text-sm">
            <span className="flex items-center justify-between">
              <span className="text-ink-secondary">Total casado</span>
              <Money value={preview.total} className="font-bold" />
            </span>
            <span className="flex items-center justify-between">
              <span className="text-ink-secondary">
                Valor gerado ({formula.percent}%)
              </span>
              <Money
                value={preview.generatedAmount}
                className="font-bold text-accent"
              />
            </span>
          </div>

          <FormField label="Mês de destino">
            <Select
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
            >
              {targetOptions.map((month) => (
                <option
                  key={month}
                  value={month}
                  disabled={preview.closedMonths.includes(month)}
                >
                  {monthLabel(month)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      <div className="mt-4">
        <Button
          fullWidth
          disabled={
            preview === null ||
            preview.matches.length === 0 ||
            preview.generatedAmount <= 0 ||
            targetClosed
          }
          onClick={handleGenerate}
        >
          Gerar lançamento
        </Button>
      </div>
    </Modal>
  );
}
