import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { db, type Product } from '../db/database'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { formatMoney } from '../utils/format'
import './Products.css'

const EMPTY_PRODUCT = {
  name: '', category: '', costPrice: 0, salePrice: 0, stock: 0, active: true,
}

export function Products() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Product> & { id?: number }>(EMPTY_PRODUCT)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const all = await db.products.toArray()
    setProducts(all.sort((a, b) => a.name.localeCompare(b.name)))
  }

  function openNew() {
    setEditing({ ...EMPTY_PRODUCT })
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditing({ ...p })
    setModalOpen(true)
  }

  async function save() {
    if (!editing.name?.trim() || !editing.salePrice) {
      toast('Preencha nome e preco de venda', 'error')
      return
    }

    const data: Product = {
      ...editing as Product,
      name: editing.name!.trim(),
      category: editing.category?.trim() || '',
      costPrice: Number(editing.costPrice) || 0,
      salePrice: Number(editing.salePrice) || 0,
      stock: Number(editing.stock) || 0,
      active: editing.active !== false,
      updatedAt: Date.now(),
      createdAt: editing.createdAt || Date.now(),
    }

    if (editing.id) {
      await db.products.update(editing.id, data)
      toast('Produto atualizado')
    } else {
      delete (data as Partial<Product>).id
      await db.products.add(data)
      toast('Produto criado')
    }

    setModalOpen(false)
    loadProducts()
  }

  async function remove(id: number) {
    if (!confirm('Remover este produto?')) return
    await db.products.delete(id)
    toast('Produto removido')
    loadProducts()
  }

  const filtered = search
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      )
    : products

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Produtos</h1>
        <button className="btn btn-accent" onClick={openNew}>
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar por nome ou categoria..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint" style={{ padding: 'var(--space-10) 0' }}>
          {products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
        </div>
      ) : (
        <div className="product-list">
          {filtered.map(p => (
            <div key={p.id} className={`product-row ${!p.active ? 'inactive' : ''}`}>
              <div className="product-main">
                <span className="product-name">{p.name}</span>
                <span className="product-category">{p.category || 'Sem categoria'}</span>
              </div>
              <div className="product-prices">
                <span className="product-sale tabular">{formatMoney(p.salePrice)}</span>
                {p.costPrice > 0 && (
                  <span className="product-cost tabular">Custo: {formatMoney(p.costPrice)}</span>
                )}
              </div>
              <div className="product-stock">
                <span className={`stock-badge ${p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : ''}`}>
                  {p.stock <= 0 ? 'Sem estoque' : p.stock + ' un.'}
                </span>
              </div>
              <div className="product-actions">
                <button className="btn btn-ghost" onClick={() => openEdit(p)}>
                  <Pencil size={16} />
                </button>
                <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => remove(p.id!)}>
                  <Trash2 size={16} />
                </button>
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
        <div className="form-grid">
          <div className="form-field full">
            <label>Nome do Produto</label>
            <input
              type="text"
              value={editing.name || ''}
              onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Cachorro-quente"
            />
          </div>
          <div className="form-field full">
            <label>Categoria</label>
            <input
              type="text"
              list="cat-list"
              value={editing.category || ''}
              onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
              placeholder="Ex: Lanches, Bebidas..."
            />
            <datalist id="cat-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="form-field">
            <label>Preco de Custo (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={editing.costPrice || ''}
              onChange={e => setEditing(p => ({ ...p, costPrice: parseFloat(e.target.value) || 0 }))}
              placeholder="0,00"
            />
          </div>
          <div className="form-field">
            <label>Preco de Venda (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={editing.salePrice || ''}
              onChange={e => setEditing(p => ({ ...p, salePrice: parseFloat(e.target.value) || 0 }))}
              placeholder="0,00"
            />
          </div>
          <div className="form-field">
            <label>Estoque</label>
            <input
              type="number"
              inputMode="numeric"
              value={editing.stock || ''}
              onChange={e => setEditing(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select
              value={editing.active !== false ? '1' : '0'}
              onChange={e => setEditing(p => ({ ...p, active: e.target.value === '1' }))}
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </div>
        </div>
        <button className="btn btn-accent btn-full" onClick={save} style={{ marginTop: 'var(--space-4)' }}>
          Salvar
        </button>
      </Modal>
    </div>
  )
}
