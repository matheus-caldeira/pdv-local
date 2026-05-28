import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  db,
  type CustomizationGroup,
  type CustomizationItem,
} from '../db/database';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { formatMoney } from '../utils/format';
import './Customizations.css';

export function Customizations() {
  const toast = useToast();
  const [groups, setGroups] = useState<CustomizationGroup[]>([]);
  const [items, setItems] = useState<CustomizationItem[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  // Group modal
  const [groupModal, setGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<CustomizationGroup>>(
    {},
  );

  // Item modal
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<CustomizationItem>>(
    {},
  );
  const [itemGroupId, setItemGroupId] = useState<number>(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setGroups(await db.customizationGroups.toArray());
    setItems(await db.customizationItems.toArray());
  }

  // === Group CRUD ===
  function openNewGroup() {
    setEditingGroup({
      name: '',
      required: false,
      minQty: 0,
      maxQty: 10,
      chargeAfter: 0,
    });
    setGroupModal(true);
  }

  function openEditGroup(g: CustomizationGroup) {
    setEditingGroup({ ...g });
    setGroupModal(true);
  }

  async function saveGroup() {
    if (!editingGroup.name?.trim()) {
      toast('Informe o nome do grupo', 'error');
      return;
    }
    const data: CustomizationGroup = {
      name: editingGroup.name!.trim(),
      required: editingGroup.required || false,
      minQty: Number(editingGroup.minQty) || 0,
      maxQty: Number(editingGroup.maxQty) || 10,
      chargeAfter: Number(editingGroup.chargeAfter) || 0,
    };
    if (editingGroup.id) {
      await db.customizationGroups.update(editingGroup.id, data);
      toast('Grupo atualizado');
    } else {
      await db.customizationGroups.add(data);
      toast('Grupo criado');
    }
    setGroupModal(false);
    load();
  }

  async function removeGroup(id: number) {
    if (!confirm('Remover grupo e todos seus itens?')) return;
    await db.customizationItems.where('groupId').equals(id).delete();
    await db.customizationGroups.delete(id);
    // Remove from products
    const products = await db.products.toArray();
    for (const p of products) {
      if (p.customizationGroupIds?.includes(id)) {
        await db.products.update(p.id!, {
          customizationGroupIds: p.customizationGroupIds.filter(
            (gid) => gid !== id,
          ),
        });
      }
    }
    toast('Grupo removido');
    load();
  }

  // === Item CRUD ===
  function openNewItem(groupId: number) {
    setItemGroupId(groupId);
    setEditingItem({
      name: '',
      price: 0,
      maxQty: 0,
      chargeAfter: 0,
      active: true,
    });
    setItemModal(true);
  }

  function openEditItem(item: CustomizationItem) {
    setItemGroupId(item.groupId);
    setEditingItem({ ...item });
    setItemModal(true);
  }

  async function saveItem() {
    if (!editingItem.name?.trim()) {
      toast('Informe o nome do item', 'error');
      return;
    }
    const data: CustomizationItem = {
      groupId: itemGroupId,
      name: editingItem.name!.trim(),
      price: Number(editingItem.price) || 0,
      maxQty: Number(editingItem.maxQty) || 0,
      chargeAfter: Number(editingItem.chargeAfter) || 0,
      active: editingItem.active !== false,
    };
    if (editingItem.id) {
      await db.customizationItems.update(editingItem.id, data);
      toast('Item atualizado');
    } else {
      await db.customizationItems.add(data);
      toast('Item adicionado');
    }
    setItemModal(false);
    load();
  }

  async function removeItem(id: number) {
    if (!confirm('Remover este item?')) return;
    await db.customizationItems.delete(id);
    toast('Item removido');
    load();
  }

  return (
    <div className="custom-page">
      <div className="page-header">
        <h1>Customizacoes</h1>
        <button className="btn btn-accent" onClick={openNewGroup}>
          <Plus size={18} /> Novo Grupo
        </button>
      </div>

      <p className="custom-desc">
        Crie grupos de customizacao (ex: Adicionais, Tipo do pao) e adicione
        itens com precos. Vincule os grupos aos produtos na tela de Produtos.
      </p>

      {groups.length === 0 ? (
        <div className="empty-hint" style={{ padding: 'var(--space-10) 0' }}>
          Nenhum grupo criado
        </div>
      ) : (
        <div className="custom-groups">
          {groups.map((g) => {
            const groupItems = items.filter((i) => i.groupId === g.id);
            const isExpanded = expandedGroup === g.id;
            return (
              <div key={g.id} className="custom-group-card">
                <div
                  className="custom-group-header"
                  onClick={() => setExpandedGroup(isExpanded ? null : g.id!)}
                >
                  <div className="custom-group-toggle">
                    {isExpanded ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </div>
                  <div className="custom-group-info">
                    <span className="custom-group-name">{g.name}</span>
                    <div className="custom-group-meta">
                      {g.required && (
                        <span className="custom-tag required">Obrigatorio</span>
                      )}
                      {!g.required && (
                        <span className="custom-tag">Opcional</span>
                      )}
                      <span className="custom-tag">
                        Min: {g.minQty} / Max: {g.maxQty}
                      </span>
                      {g.chargeAfter > 0 && (
                        <span className="custom-tag">
                          Cobra a partir de {g.chargeAfter}
                        </span>
                      )}
                      <span className="custom-tag">
                        {groupItems.length}{' '}
                        {groupItems.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>
                  <div
                    className="custom-group-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="btn btn-ghost"
                      onClick={() => openEditGroup(g)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => removeGroup(g.id!)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="custom-group-body">
                    {groupItems.length === 0 ? (
                      <div className="custom-items-empty">
                        Nenhum item neste grupo
                      </div>
                    ) : (
                      groupItems.map((item) => (
                        <div
                          key={item.id}
                          className={`custom-item-row ${!item.active ? 'inactive' : ''}`}
                        >
                          <span className="custom-item-name">{item.name}</span>
                          <span className="custom-item-price tabular">
                            {item.price > 0
                              ? formatMoney(item.price)
                              : 'Gratis'}
                          </span>
                          {(item.maxQty || 0) > 0 && (
                            <span className="custom-item-charge">
                              max {item.maxQty}
                            </span>
                          )}
                          {item.chargeAfter > 0 && (
                            <span className="custom-item-charge">
                              cobra +{item.chargeAfter}
                            </span>
                          )}
                          <div className="custom-item-actions">
                            <button
                              className="btn btn-ghost"
                              onClick={() => openEditItem(item)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => removeItem(item.id!)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    <button
                      className="btn btn-outline btn-sm custom-add-item"
                      onClick={() => openNewItem(g.id!)}
                    >
                      <Plus size={14} /> Adicionar Item
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Group modal */}
      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title={editingGroup.id ? 'Editar Grupo' : 'Novo Grupo'}
      >
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label>Nome do Grupo</label>
            <input
              type="text"
              value={editingGroup.name || ''}
              onChange={(e) =>
                setEditingGroup((g) => ({ ...g, name: e.target.value }))
              }
              placeholder="Ex: Adicionais, Tipo do pao..."
            />
          </div>
          <div className="form-field">
            <label>Obrigatorio?</label>
            <select
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
            </select>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label>Minimo</label>
              <input
                type="number"
                inputMode="numeric"
                value={editingGroup.minQty ?? ''}
                onChange={(e) =>
                  setEditingGroup((g) => ({
                    ...g,
                    minQty:
                      e.target.value === '' ? 0 : parseInt(e.target.value),
                  }))
                }
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label>Maximo</label>
              <input
                type="number"
                inputMode="numeric"
                value={editingGroup.maxQty ?? ''}
                onChange={(e) =>
                  setEditingGroup((g) => ({
                    ...g,
                    maxQty:
                      e.target.value === ''
                        ? (undefined as unknown as number)
                        : parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="form-field">
            <label>Cobrar a partir de (selecoes)</label>
            <input
              type="number"
              inputMode="numeric"
              value={editingGroup.chargeAfter ?? ''}
              onChange={(e) =>
                setEditingGroup((g) => ({
                  ...g,
                  chargeAfter:
                    e.target.value === '' ? 0 : parseInt(e.target.value),
                }))
              }
              placeholder="0 = sempre cobra"
            />
            <span className="form-hint">
              Ex: 2 = as 2 primeiras selecoes sao gratis
            </span>
          </div>
        </div>
        <button
          className="btn btn-accent btn-full"
          onClick={saveGroup}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Salvar
        </button>
      </Modal>

      {/* Item modal */}
      <Modal
        open={itemModal}
        onClose={() => setItemModal(false)}
        title={editingItem.id ? 'Editar Item' : 'Novo Item'}
      >
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label>Nome</label>
            <input
              type="text"
              value={editingItem.name || ''}
              onChange={(e) =>
                setEditingItem((i) => ({ ...i, name: e.target.value }))
              }
              placeholder="Ex: Bacon extra, Cheddar..."
            />
          </div>
          <div className="form-field">
            <label>Preco (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={editingItem.price ?? ''}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  price: e.target.value === '' ? 0 : parseFloat(e.target.value),
                }))
              }
              placeholder="0,00 = gratis"
            />
          </div>
          <div className="form-field">
            <label>Maximo por item</label>
            <input
              type="number"
              inputMode="numeric"
              value={editingItem.maxQty ?? ''}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  maxQty: e.target.value === '' ? 0 : parseInt(e.target.value),
                }))
              }
              placeholder="0 = sem limite"
            />
            <span className="form-hint">0 = usa o limite do grupo</span>
          </div>
          <div className="form-field">
            <label>Cobrar a partir de (unidades)</label>
            <input
              type="number"
              inputMode="numeric"
              value={editingItem.chargeAfter ?? ''}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  chargeAfter:
                    e.target.value === '' ? 0 : parseInt(e.target.value),
                }))
              }
              placeholder="0 = sempre cobra"
            />
            <span className="form-hint">
              Ex: 1 = primeira unidade gratis, cobra a partir da 2a
            </span>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select
              value={editingItem.active !== false ? '1' : '0'}
              onChange={(e) =>
                setEditingItem((i) => ({
                  ...i,
                  active: e.target.value === '1',
                }))
              }
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </div>
        </div>
        <button
          className="btn btn-accent btn-full"
          onClick={saveItem}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Salvar
        </button>
      </Modal>
    </div>
  );
}
