import { useState } from 'react';
import { Pencil, Play, Trash2 } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { FormField } from '../../molecules/FormField';
import { Modal } from '../../molecules/Modal';
import { Select } from '../../molecules/Select';
import { TextField } from '../../molecules/TextField';
import { FormulaPreviewModal } from './FormulaPreviewModal';
import { categoryOptions, KIND_OPTIONS } from './FinanceAutomationsSupport';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceFormula,
  FinanceKind,
  MonthKey,
} from '../../../domain/finance/finance.entity';
import type {
  FormulaInput,
  FormulaPreview,
  FormulaPreviewInput,
  GenerateFormulaInput,
} from '../../../application/finance/automations.usecases';

interface FinanceFormulaSectionProps {
  formulas: FinanceFormula[];
  categories: FinanceCategory[];
  members: FamilyMember[];
  currentMonth: MonthKey;
  onSave(input: FormulaInput): Promise<boolean>;
  onDelete(uid: string): Promise<boolean>;
  onPreview(input: FormulaPreviewInput): Promise<FormulaPreview | null>;
  onGenerate(input: GenerateFormulaInput): Promise<boolean>;
}

export function FinanceFormulaSection({
  formulas,
  categories,
  members,
  currentMonth,
  onSave,
  onDelete,
  onPreview,
  onGenerate,
}: FinanceFormulaSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [filterKind, setFilterKind] = useState<FinanceKind>('income');
  const [filterCategoryUids, setFilterCategoryUids] = useState<string[]>([]);
  const [filterMemberUids, setFilterMemberUids] = useState<string[]>([]);
  const [outputKind, setOutputKind] = useState<FinanceKind>('expense');
  const [outputCategoryUid, setOutputCategoryUid] = useState('');
  const [outputDescription, setOutputDescription] = useState('');
  const [generating, setGenerating] = useState<FinanceFormula | null>(null);

  function openCreate() {
    setEditingUid(null);
    setName('');
    setPercent('');
    setFilterKind('income');
    setFilterCategoryUids([]);
    setFilterMemberUids([]);
    setOutputKind('expense');
    setOutputCategoryUid('');
    setOutputDescription('');
    setFormOpen(true);
  }

  function openEdit(formula: FinanceFormula) {
    setEditingUid(formula.uid);
    setName(formula.name);
    setPercent(String(formula.percent));
    setFilterKind(formula.filter.kind);
    setFilterCategoryUids([...formula.filter.categoryUids]);
    setFilterMemberUids([...formula.filter.memberUids]);
    setOutputKind(formula.outputKind);
    setOutputCategoryUid(formula.outputCategoryUid);
    setOutputDescription(formula.outputDescription);
    setFormOpen(true);
  }

  function changeFilterKind(kind: FinanceKind) {
    setFilterKind(kind);
    setFilterCategoryUids([]);
  }

  function changeOutputKind(kind: FinanceKind) {
    setOutputKind(kind);
    setOutputCategoryUid('');
  }

  function toggleFilterCategory(uid: string) {
    setFilterCategoryUids((prev) =>
      prev.includes(uid)
        ? prev.filter((categoryUid) => categoryUid !== uid)
        : [...prev, uid],
    );
  }

  function toggleFilterMember(uid: string) {
    setFilterMemberUids((prev) =>
      prev.includes(uid)
        ? prev.filter((memberUid) => memberUid !== uid)
        : [...prev, uid],
    );
  }

  async function handleSubmit() {
    const ok = await onSave({
      uid: editingUid ?? undefined,
      name,
      percent: parseFloat(percent) || 0,
      filter: {
        kind: filterKind,
        categoryUids: filterCategoryUids,
        memberUids: filterMemberUids,
      },
      outputKind,
      outputCategoryUid,
      outputDescription,
    });
    if (ok) setFormOpen(false);
  }

  return (
    <section aria-label="Fórmulas" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Fórmulas</h2>
        <Button size="sm" onClick={openCreate}>
          Nova fórmula
        </Button>
      </div>

      {formulas.length === 0 ? (
        <p className="text-sm text-ink-tertiary">Nenhuma fórmula cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {formulas.map((formula) => (
            <li
              key={formula.uid}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-primary">
                    {formula.name}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ink-secondary">
                    {formula.percent}%
                  </span>
                </div>
                <div className="text-xs text-ink-tertiary">
                  Saída: {formula.outputDescription}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGenerating(formula)}
                >
                  <Play size={14} /> Gerar
                </Button>
                <IconButton
                  aria-label={`Editar fórmula ${formula.name}`}
                  onClick={() => openEdit(formula)}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton
                  tone="danger"
                  aria-label={`Excluir fórmula ${formula.name}`}
                  onClick={() => onDelete(formula.uid)}
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
        title={editingUid ? 'Editar fórmula' : 'Nova fórmula'}
      >
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Nome">
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: DARF PJ"
            />
          </FormField>
          <FormField label="Percentual (%)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Tipo do filtro">
            <Select
              value={filterKind}
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
              {categoryOptions(categories, filterKind, '').map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-1 text-sm text-ink-secondary"
                >
                  <input
                    type="checkbox"
                    checked={filterCategoryUids.includes(option.value)}
                    onChange={() => toggleFilterCategory(option.value)}
                  />
                  {option.label}
                </label>
              ))}
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
              {members.map((member) => (
                <label
                  key={member.uid}
                  className="flex items-center gap-1 text-sm text-ink-secondary"
                >
                  <input
                    type="checkbox"
                    checked={filterMemberUids.includes(member.uid)}
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
          <FormField label="Tipo de saída">
            <Select
              value={outputKind}
              onChange={(e) => changeOutputKind(e.target.value as FinanceKind)}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Categoria de saída">
            <Select
              value={outputCategoryUid}
              onChange={(e) => setOutputCategoryUid(e.target.value)}
            >
              <option value="">Selecione</option>
              {categoryOptions(categories, outputKind, outputCategoryUid).map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </Select>
          </FormField>
          <FormField label="Descrição de saída">
            <TextField
              value={outputDescription}
              onChange={(e) => setOutputDescription(e.target.value)}
              placeholder="Ex: DARF"
            />
          </FormField>
        </div>
        <div className="mt-4">
          <Button
            fullWidth
            disabled={outputCategoryUid === ''}
            onClick={handleSubmit}
          >
            Salvar fórmula
          </Button>
        </div>
      </Modal>

      {generating !== null && (
        <FormulaPreviewModal
          formula={generating}
          categories={categories}
          members={members}
          currentMonth={currentMonth}
          onPreview={onPreview}
          onGenerate={onGenerate}
          onClose={() => setGenerating(null)}
        />
      )}
    </section>
  );
}
