import { useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { FormField } from '../../molecules/FormField';
import { Modal } from '../../molecules/Modal';
import { TextField } from '../../molecules/TextField';
import type { FamilyMember } from '../../../domain/finance/finance.entity';

interface FinanceMemberManagerProps {
  members: FamilyMember[];
  onCreate: (name: string) => Promise<boolean>;
  onRename: (uid: string, name: string) => Promise<boolean>;
  onArchive: (uid: string, archived: boolean) => Promise<boolean>;
  onDelete: (uid: string) => Promise<boolean>;
}

export function FinanceMemberManager({
  members,
  onCreate,
  onRename,
  onArchive,
  onDelete,
}: FinanceMemberManagerProps) {
  const [name, setName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [renaming, setRenaming] = useState<FamilyMember | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const active = members.filter((member) => !member.archived);
  const archived = members.filter((member) => member.archived);

  async function handleCreate() {
    const ok = await onCreate(name);
    if (ok) setName('');
  }

  function openRename(member: FamilyMember) {
    setRenaming(member);
    setRenameValue(member.name);
  }

  async function handleRename(member: FamilyMember) {
    const ok = await onRename(member.uid, renameValue);
    if (ok) setRenaming(null);
  }

  async function handleDelete(member: FamilyMember) {
    if (!window.confirm(`Excluir o membro "${member.name}"?`)) return;
    await onDelete(member.uid);
  }

  function renderRow(member: FamilyMember) {
    return (
      <li
        key={member.uid}
        className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-4 py-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-primary">
            {member.name}
          </span>
          {member.archived && <Badge tone="warning">arquivado</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            aria-label={`Renomear ${member.name}`}
            onClick={() => openRename(member)}
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            aria-label={
              member.archived
                ? `Desarquivar ${member.name}`
                : `Arquivar ${member.name}`
            }
            onClick={() => onArchive(member.uid, !member.archived)}
          >
            {member.archived ? (
              <ArchiveRestore size={16} />
            ) : (
              <Archive size={16} />
            )}
          </IconButton>
          <IconButton
            tone="danger"
            aria-label={`Excluir ${member.name}`}
            onClick={() => handleDelete(member)}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </li>
    );
  }

  return (
    <section
      aria-labelledby="finance-members-title"
      className="flex flex-col gap-4"
    >
      <h2
        id="finance-members-title"
        className="text-lg font-bold tracking-tight"
      >
        Membros da família
      </h2>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-4 md:flex-row md:items-end">
        <FormField label="Nome do membro" className="md:flex-1">
          <TextField
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Maria"
          />
        </FormField>
        <Button
          size="sm"
          className="md:min-h-[44px]"
          disabled={name.trim() === ''}
          onClick={handleCreate}
        >
          <Plus size={16} /> Adicionar membro
        </Button>
      </div>

      {active.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-tertiary">
          Nenhum membro ativo.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {active.map((member) => renderRow(member))}
        </ul>
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
            <ul className="flex flex-col gap-1">
              {archived.map((member) => renderRow(member))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Renomear membro"
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
