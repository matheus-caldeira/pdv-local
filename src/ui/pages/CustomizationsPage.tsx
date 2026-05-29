import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { Badge } from '../atoms/Badge';
import { IconButton } from '../atoms/IconButton';
import { Modal } from '../molecules/Modal';
import { FormField } from '../molecules/FormField';
import { TextField } from '../molecules/TextField';
import { Select } from '../molecules/Select';
import { cn } from '../lib/cn';
import { useCustomizations } from '../hooks/useCustomizations';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../../domain/customization/customization.entity';
import type {
  CustomizationGroupInput,
  CustomizationItemInput,
} from '../../domain/customization/customization.rules';

interface GroupForm {
  id?: number;
  name: string;
  required: boolean;
  minQty: number;
  maxQty: number;
  chargeAfter: number;
}

interface ItemForm {
  id?: number;
  groupId: number;
  name: string;
  price: number;
  maxQty: number;
  chargeAfter: number;
  active: boolean;
}

const EMPTY_GROUP: GroupForm = {
  name: '',
  required: false,
  minQty: 0,
  maxQty: 10,
  chargeAfter: 0,
};

const EMPTY_ITEM: Omit<ItemForm, 'groupId'> = {
  name: '',
  price: 0,
  maxQty: 0,
  chargeAfter: 0,
  active: true,
};

export function CustomizationsPage() {
  const { groups, items, saveGroup, removeGroup, saveItem, removeItem } =
    useCustomizations();
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  const [groupModal, setGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupForm>(EMPTY_GROUP);

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemForm>({
    ...EMPTY_ITEM,
    groupId: 0,
  });

  function openNewGroup() {
    setEditingGroup({ ...EMPTY_GROUP });
    setGroupModal(true);
  }

  function openEditGroup(g: CustomizationGroup) {
    setEditingGroup({
      id: g.id,
      name: g.name,
      required: g.required,
      minQty: g.minQty,
      maxQty: g.maxQty,
      chargeAfter: g.chargeAfter,
    });
    setGroupModal(true);
  }

  async function handleSaveGroup() {
    const input: CustomizationGroupInput = {
      name: editingGroup.name,
      required: editingGroup.required,
      minQty: editingGroup.minQty,
      maxQty: editingGroup.maxQty,
      chargeAfter: editingGroup.chargeAfter,
    };
    const ok = await saveGroup(input, editingGroup.id);
    if (ok) setGroupModal(false);
  }

  function handleRemoveGroup(id: number) {
    if (!window.confirm('Remover grupo e todos seus itens?')) return;
    removeGroup(id);
  }

  function openNewItem(groupId: number) {
    setEditingItem({ ...EMPTY_ITEM, groupId });
    setItemModal(true);
  }

  function openEditItem(item: CustomizationItem) {
    setEditingItem({
      id: item.id,
      groupId: item.groupId,
      name: item.name,
      price: item.price,
      maxQty: item.maxQty,
      chargeAfter: item.chargeAfter,
      active: item.active,
    });
    setItemModal(true);
  }

  async function handleSaveItem() {
    const input: CustomizationItemInput = {
      groupId: editingItem.groupId,
      name: editingItem.name,
      price: editingItem.price,
      maxQty: editingItem.maxQty,
      chargeAfter: editingItem.chargeAfter,
      active: editingItem.active,
    };
    const ok = await saveItem(input, editingItem.id);
    if (ok) setItemModal(false);
  }

  function handleRemoveItem(id: number) {
    if (!window.confirm('Remover este item?')) return;
    removeItem(id);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Customizacoes
        </h1>
        <Button onClick={openNewGroup}>
          <Plus size={18} /> Novo Grupo
        </Button>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-ink-secondary">
        Crie grupos de customizacao (ex: Adicionais, Tipo do pao) e adicione
        itens com precos. Vincule os grupos aos produtos na tela de Produtos.
      </p>

      {groups.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-muted">
          Nenhum grupo criado
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const groupItems = items.filter((i) => i.groupId === g.id);
            const isExpanded = expandedGroup === g.id;
            return (
              <div
                key={g.id}
                className="overflow-hidden rounded-lg border border-border bg-surface-2"
              >
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    aria-label={
                      isExpanded ? `Recolher ${g.name}` : `Expandir ${g.name}`
                    }
                    aria-expanded={isExpanded}
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => setExpandedGroup(isExpanded ? null : g.id!)}
                  >
                    <span className="flex-shrink-0 text-ink-tertiary">
                      {isExpanded ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{g.name}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <Badge
                          tone={g.required ? 'accent' : 'muted'}
                          size="xs"
                          uppercase
                        >
                          {g.required ? 'Obrigatorio' : 'Opcional'}
                        </Badge>
                        <Badge size="xs" uppercase>
                          Min: {g.minQty} / Max: {g.maxQty}
                        </Badge>
                        {g.chargeAfter > 0 && (
                          <Badge size="xs" uppercase>
                            Cobra a partir de {g.chargeAfter}
                          </Badge>
                        )}
                        <Badge size="xs" uppercase>
                          {groupItems.length}{' '}
                          {groupItems.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-shrink-0 gap-1">
                    <IconButton
                      aria-label={`Editar ${g.name}`}
                      onClick={() => openEditGroup(g)}
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      tone="danger"
                      aria-label={`Remover ${g.name}`}
                      onClick={() => handleRemoveGroup(g.id!)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3">
                    {groupItems.length === 0 ? (
                      <div className="py-3 text-center text-sm text-ink-muted">
                        Nenhum item neste grupo
                      </div>
                    ) : (
                      groupItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center gap-3 border-b border-border py-2 last:border-b-0',
                            !item.active && 'opacity-50',
                          )}
                        >
                          <span className="flex-1 text-sm font-medium">
                            {item.name}
                          </span>
                          {item.price > 0 ? (
                            <Money
                              value={item.price}
                              className="text-sm font-bold text-accent"
                            />
                          ) : (
                            <span className="text-sm font-bold text-accent">
                              Gratis
                            </span>
                          )}
                          {item.maxQty > 0 && (
                            <Badge size="xs">max {item.maxQty}</Badge>
                          )}
                          {item.chargeAfter > 0 && (
                            <Badge size="xs">cobra +{item.chargeAfter}</Badge>
                          )}
                          <div className="flex flex-shrink-0 gap-1">
                            <IconButton
                              aria-label={`Editar ${item.name}`}
                              onClick={() => openEditItem(item)}
                            >
                              <Pencil size={14} />
                            </IconButton>
                            <IconButton
                              tone="danger"
                              aria-label={`Remover ${item.name}`}
                              onClick={() => handleRemoveItem(item.id!)}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="mt-3"
                      onClick={() => openNewItem(g.id!)}
                    >
                      <Plus size={14} /> Adicionar Item
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title={editingGroup.id ? 'Editar Grupo' : 'Novo Grupo'}
      >
        <div className="flex flex-col gap-3">
          <FormField label="Nome do Grupo">
            <TextField
              value={editingGroup.name}
              onChange={(e) =>
                setEditingGroup((g) => ({ ...g, name: e.target.value }))
              }
              placeholder="Ex: Adicionais, Tipo do pao..."
            />
          </FormField>
          <FormField label="Obrigatorio?">
            <Select
              value={editingGroup.required ? '1' : '0'}
              onChange={(e) =>
                setEditingGroup((g) => ({
                  ...g,
                  required: e.target.value === '1',
                }))
              }
            >
              <option value="0">Nao - cliente pode pular</option>
              <option value="1">Sim - deve escolher</option>
            </Select>
          </FormField>
          <div className="flex gap-3">
            <FormField label="Minimo" className="flex-1">
              <TextField
                type="number"
                inputMode="numeric"
                value={editingGroup.minQty}
                onChange={(e) =>
                  setEditingGroup((g) => ({
                    ...g,
                    minQty:
                      e.target.value === '' ? 0 : parseInt(e.target.value),
                  }))
                }
              />
            </FormField>
            <FormField label="Maximo" className="flex-1">
              <TextField
                type="number"
                inputMode="numeric"
                value={editingGroup.maxQty}
                onChange={(e) =>
                  setEditingGroup((g) => ({
                    ...g,
                    maxQty:
                      e.target.value === '' ? 0 : parseInt(e.target.value),
                  }))
                }
              />
            </FormField>
          </div>
          <FormField
            label="Cobrar a partir de (selecoes)"
            hint="Ex: 2 = as 2 primeiras selecoes sao gratis"
          >
            <TextField
              type="number"
              inputMode="numeric"
              value={editingGroup.chargeAfter}
              onChange={(e) =>
                setEditingGroup((g) => ({
                  ...g,
                  chargeAfter:
                    e.target.value === '' ? 0 : parseInt(e.target.value),
                }))
              }
              placeholder="0 = sempre cobra"
            />
          </FormField>
        </div>
        <Button fullWidth className="mt-4" onClick={handleSaveGroup}>
          Salvar
        </Button>
      </Modal>

      <Modal
        open={itemModal}
        onClose={() => setItemModal(false)}
        title={editingItem.id ? 'Editar Item' : 'Novo Item'}
      >
        <div className="flex flex-col gap-3">
          <FormField label="Nome">
            <TextField
              value={editingItem.name}
              onChange={(e) =>
                setEditingItem((i) => ({ ...i, name: e.target.value }))
              }
              placeholder="Ex: Bacon extra, Cheddar..."
            />
          </FormField>
          <FormField label="Preco (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={editingItem.price}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  price: e.target.value === '' ? 0 : parseFloat(e.target.value),
                }))
              }
              placeholder="0,00 = gratis"
            />
          </FormField>
          <FormField label="Maximo por item" hint="0 = usa o limite do grupo">
            <TextField
              type="number"
              inputMode="numeric"
              value={editingItem.maxQty}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  maxQty: e.target.value === '' ? 0 : parseInt(e.target.value),
                }))
              }
              placeholder="0 = sem limite"
            />
          </FormField>
          <FormField
            label="Cobrar a partir de (unidades)"
            hint="Ex: 1 = primeira unidade gratis, cobra a partir da 2a"
          >
            <TextField
              type="number"
              inputMode="numeric"
              value={editingItem.chargeAfter}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  chargeAfter:
                    e.target.value === '' ? 0 : parseInt(e.target.value),
                }))
              }
              placeholder="0 = sempre cobra"
            />
          </FormField>
          <FormField label="Status">
            <Select
              value={editingItem.active ? '1' : '0'}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  active: e.target.value === '1',
                }))
              }
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </Select>
          </FormField>
        </div>
        <Button fullWidth className="mt-4" onClick={handleSaveItem}>
          Salvar
        </Button>
      </Modal>
    </div>
  );
}
