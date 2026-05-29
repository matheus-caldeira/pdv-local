import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { Badge } from '../atoms/Badge';
import { IconButton } from '../atoms/IconButton';
import { Modal } from '../molecules/Modal';
import { SearchField } from '../molecules/SearchField';
import { FormField } from '../molecules/FormField';
import { TextField } from '../molecules/TextField';
import { Select } from '../molecules/Select';
import { cn } from '../lib/cn';
import { useProductsCatalog } from '../hooks/useProductsCatalog';
import type { Product } from '../../domain/product/product.entity';
import type { ProductInput } from '../../domain/product/product.rules';

interface FormState {
  id?: number;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  active: boolean;
  customizationGroupIds: number[];
}

const EMPTY_PRODUCT: FormState = {
  name: '',
  category: '',
  costPrice: 0,
  salePrice: 0,
  stock: 0,
  active: true,
  customizationGroupIds: [],
};

function stockTone(stock: number): 'success' | 'warning' | 'danger' {
  if (stock <= 0) return 'danger';
  if (stock <= 5) return 'warning';
  return 'success';
}

export function ProductsPage() {
  const { products, groups, saveProduct, removeProduct } = useProductsCatalog();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FormState>(EMPTY_PRODUCT);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term),
    );
  }, [products, search]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );

  function openNew() {
    setEditing({ ...EMPTY_PRODUCT });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing({
      id: p.id,
      name: p.name,
      category: p.category,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stock: p.stock,
      active: p.active,
      customizationGroupIds: [...p.customizationGroupIds],
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const input: ProductInput = {
      name: editing.name,
      category: editing.category,
      costPrice: editing.costPrice,
      salePrice: editing.salePrice,
      stock: editing.stock,
      active: editing.active,
      customizationGroupIds: editing.customizationGroupIds,
    };
    const ok = await saveProduct(input, editing.id);
    if (ok) setModalOpen(false);
  }

  function handleRemove(id: number) {
    if (!window.confirm('Remover este produto?')) return;
    removeProduct(id);
  }

  function toggleGroup(groupId: number) {
    setEditing((p) => ({
      ...p,
      customizationGroupIds: p.customizationGroupIds.includes(groupId)
        ? p.customizationGroupIds.filter((id) => id !== groupId)
        : [...p.customizationGroupIds, groupId],
    }));
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Produtos</h1>
        <Button onClick={openNew}>
          <Plus size={18} /> Novo Produto
        </Button>
      </div>

      <div className="mb-4">
        <SearchField
          aria-label="Buscar produtos"
          placeholder="Buscar por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-muted">
          {products.length === 0
            ? 'Nenhum produto cadastrado'
            : 'Nenhum produto encontrado'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={cn(
                'flex flex-wrap items-center gap-4 rounded-md border border-border bg-surface-2 p-4 transition-colors hover:bg-surface-1',
                !p.active && 'opacity-50',
              )}
            >
              <div className="min-w-0 flex-1">
                <span className="block font-semibold">{p.name}</span>
                <span className="text-xs text-ink-tertiary">
                  {p.category || 'Sem categoria'}
                </span>
              </div>
              <div className="text-right">
                <Money
                  value={p.salePrice}
                  className="block font-bold text-accent"
                />
                {p.costPrice > 0 && (
                  <span className="text-xs text-ink-tertiary">
                    Custo: <Money value={p.costPrice} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={stockTone(p.stock)}>
                  {p.stock <= 0 ? 'Sem estoque' : p.stock + ' un.'}
                </Badge>
                {p.customizationGroupIds.length > 0 && (
                  <Badge tone="info" size="xs">
                    <Settings2 size={10} /> {p.customizationGroupIds.length}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <IconButton
                  aria-label={`Editar ${p.name}`}
                  onClick={() => openEdit(p)}
                >
                  <Pencil size={16} />
                </IconButton>
                <IconButton
                  tone="danger"
                  aria-label={`Remover ${p.name}`}
                  onClick={() => handleRemove(p.id!)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing.id ? 'Editar Produto' : 'Novo Produto'}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Nome do Produto" className="sm:col-span-2">
            <TextField
              value={editing.name}
              onChange={(e) =>
                setEditing((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Ex: Cachorro-quente"
            />
          </FormField>
          <FormField label="Categoria" className="sm:col-span-2">
            <TextField
              list="cat-list"
              value={editing.category}
              onChange={(e) =>
                setEditing((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="Ex: Lanches, Bebidas..."
            />
            <datalist id="cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Preco de Custo (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={editing.costPrice || ''}
              onChange={(e) =>
                setEditing((p) => ({
                  ...p,
                  costPrice: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Preco de Venda (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={editing.salePrice || ''}
              onChange={(e) =>
                setEditing((p) => ({
                  ...p,
                  salePrice: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Estoque">
            <TextField
              type="number"
              inputMode="numeric"
              value={editing.stock || ''}
              onChange={(e) =>
                setEditing((p) => ({
                  ...p,
                  stock: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </FormField>
          <FormField label="Status">
            <Select
              value={editing.active ? '1' : '0'}
              onChange={(e) =>
                setEditing((p) => ({ ...p, active: e.target.value === '1' }))
              }
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </Select>
          </FormField>
        </div>

        {groups.length > 0 && (
          <div className="mt-3">
            <span className="mb-2 block text-xs font-semibold text-ink-secondary">
              Grupos de Customizacao
            </span>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const selected = editing.customizationGroupIds.includes(g.id!);
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                      selected
                        ? 'border-cardapio-bg bg-cardapio-bg text-cardapio-text'
                        : 'border-border-emphasis bg-surface-2 text-ink-secondary hover:bg-surface-inset',
                    )}
                    onClick={() => toggleGroup(g.id!)}
                  >
                    {g.name}
                    {g.required && (
                      <span className="ml-0.5 text-accent">*</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button fullWidth className="mt-4" onClick={handleSave}>
          Salvar
        </Button>
      </Modal>
    </div>
  );
}
