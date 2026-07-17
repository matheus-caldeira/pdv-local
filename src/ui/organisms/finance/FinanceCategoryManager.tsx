import { useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { FormField } from '../../molecules/FormField';
import { Modal } from '../../molecules/Modal';
import { Select } from '../../molecules/Select';
import { TextField } from '../../molecules/TextField';
import type {
  FinanceCategory,
  FinanceKind,
} from '../../../domain/finance/finance.entity';

const KIND_LABELS: Record<FinanceKind, string> = {
  income: 'Entrada',
  expense: 'Saída',
};

interface FinanceCategoryManagerProps {
  categories: FinanceCategory[];
  onCreate: (input: { name: string; kind: FinanceKind }) => Promise<boolean>;
  onRename: (uid: string, name: string) => Promise<boolean>;
  onArchive: (uid: string, archived: boolean) => Promise<boolean>;
  onDelete: (uid: string) => Promise<boolean>;
}

export function FinanceCategoryManager({
  categories,
  onCreate,
  onRename,
  onArchive,
  onDelete,
}: FinanceCategoryManagerProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const [renaming, setRenaming] = useState<FinanceCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const active = categories.filter((category) => !category.archived);
  const archived = categories.filter((category) => category.archived);
  const groups = [
    {
      title: 'Entradas',
      items: active.filter((category) => category.kind === 'income'),
    },
    {
      title: 'Saídas',
      items: active.filter((category) => category.kind === 'expense'),
    },
  ].filter((group) => group.items.length > 0);

  async function handleCreate() {
    const ok = await onCreate({ name, kind });
    if (ok) setName('');
  }

  function openRename(category: FinanceCategory) {
    setRenaming(category);
    setRenameValue(category.name);
  }

  async function handleRename(category: FinanceCategory) {
    const ok = await onRename(category.uid, renameValue);
    if (ok) setRenaming(null);
  }

  async function handleDelete(category: FinanceCategory) {
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return;
    await onDelete(category.uid);
  }

  function renderRow(category: FinanceCategory, showKind: boolean) {
    return (
      <li
        key={category.uid}
        className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-4 py-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-primary">
            {category.name}
          </span>
          {showKind && (
            <span className="text-xs text-ink-tertiary">
              {KIND_LABELS[category.kind]}
            </span>
          )}
          {category.archived && <Badge tone="warning">arquivada</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            aria-label={`Renomear ${category.name}`}
            onClick={() => openRename(category)}
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            aria-label={
              category.archived
                ? `Desarquivar ${category.name}`
                : `Arquivar ${category.name}`
            }
            onClick={() => onArchive(category.uid, !category.archived)}
          >
            {category.archived ? (
              <ArchiveRestore size={16} />
            ) : (
              <Archive size={16} />
            )}
          </IconButton>
          <IconButton
            tone="danger"
            aria-label={`Excluir ${category.name}`}
            onClick={() => handleDelete(category)}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </li>
    );
  }

  return (
    <section
      aria-labelledby="finance-categories-title"
      className="flex flex-col gap-4"
    >
      <h2
        id="finance-categories-title"
        className="text-lg font-bold tracking-tight"
      >
        Categorias
      </h2>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-4 md:flex-row md:items-end">
        <FormField label="Nome da categoria" className="md:flex-1">
          <TextField
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Mercado"
          />
        </FormField>
        <FormField label="Tipo">
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value as FinanceKind)}
          >
            <option value="expense">Saída</option>
            <option value="income">Entrada</option>
          </Select>
        </FormField>
        <Button
          size="sm"
          className="md:min-h-[44px]"
          disabled={name.trim() === ''}
          onClick={handleCreate}
        >
          <Plus size={16} /> Adicionar categoria
        </Button>
      </div>

      {active.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-tertiary">
          Nenhuma categoria ativa.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.items.map((category) => renderRow(category, false))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="cursor-pointer self-start text-xs font-semibold text-ink-tertiary underline-offset-2 hover:underline"
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived
              ? 'Ocultar arquivadas'
              : `Mostrar arquivadas (${archived.length})`}
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-1">
              {archived.map((category) => renderRow(category, true))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Renomear categoria"
      >
        <FormField label="Nome">
          <TextField
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
        </FormField>
        <div className="mt-4">
          <Button
            fullWidth
            disabled={renameValue.trim() === ''}
            onClick={() => handleRename(renaming!)}
          >
            Salvar
          </Button>
        </div>
      </Modal>
    </section>
  );
}
