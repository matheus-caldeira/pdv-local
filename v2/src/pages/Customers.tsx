import { useState, useEffect } from 'react'
import { Users, Plus, Trash2 } from 'lucide-react'
import { db, type Customer } from '../db/database'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import './Customers.css'

const EMPTY: Partial<Customer> = { name: '', phone: '', addresses: [] }

export function Customers() {
  const toast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Customer> | null>(null)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const all = await db.customers.toArray()
    setCustomers(all.sort((a, b) => a.name.localeCompare(b.name)))
  }

  function openNew() { setEditing({ ...EMPTY, addresses: [] }) }
  function openEdit(c: Customer) { setEditing({ ...c, addresses: [...c.addresses] }) }

  async function save() {
    if (!editing) return
    const phone = editing.phone?.trim() || ''
    const name = editing.name?.trim() || 'Consumidor'
    if (!phone) { toast('Informe o telefone', 'error'); return }

    const dup = await db.customers.where('phone').equals(phone).first()
    if (dup && dup.id !== editing.id) {
      toast('Ja existe um cliente com esse telefone', 'error')
      return
    }

    const addresses = (editing.addresses || []).map(a => a.trim()).filter(Boolean)
    if (editing.id) {
      await db.customers.update(editing.id, { name, phone, addresses, updatedAt: Date.now() })
    } else {
      await db.customers.add({ name, phone, addresses, createdAt: Date.now(), updatedAt: Date.now() })
    }
    setEditing(null)
    loadCustomers()
    toast('Cliente salvo')
  }

  async function remove() {
    if (!editing?.id) return
    if (!confirm('Excluir este cliente?')) return
    await db.customers.delete(editing.id)
    setEditing(null)
    loadCustomers()
    toast('Cliente excluido')
  }

  const filtered = customers.filter(c => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn btn-accent" onClick={openNew}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <input
        type="text"
        className="cart-input"
        placeholder="Buscar por nome ou telefone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="customers-empty">
          <Users size={32} />
          <p>Nenhum cliente cadastrado</p>
        </div>
      ) : (
        filtered.map(c => (
          <div key={c.id} className="customer-row" onClick={() => openEdit(c)}>
            <div>
              <div className="customer-row-name">{c.name}</div>
              <div className="customer-row-meta">{c.phone}</div>
            </div>
            <div className="customer-row-meta">
              {c.addresses.length} {c.addresses.length === 1 ? 'endereco' : 'enderecos'}
            </div>
          </div>
        ))
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar Cliente' : 'Novo Cliente'}
      >
        {editing && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-field">
              <label>Nome</label>
              <input
                type="text"
                value={editing.name || ''}
                onChange={e => setEditing(p => p && { ...p, name: e.target.value })}
                placeholder="Consumidor"
              />
            </div>
            <div className="form-field">
              <label>Telefone</label>
              <input
                type="tel"
                value={editing.phone || ''}
                onChange={e => setEditing(p => p && { ...p, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="form-field">
              <label>Enderecos</label>
              {(editing.addresses || []).map((addr, i) => (
                <div key={i} className="address-row">
                  <input
                    type="text"
                    value={addr}
                    onChange={e => setEditing(p => {
                      if (!p) return p
                      const addresses = [...(p.addresses || [])]
                      addresses[i] = e.target.value
                      return { ...p, addresses }
                    })}
                    placeholder="Rua, numero, bairro..."
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditing(p => p && {
                      ...p, addresses: (p.addresses || []).filter((_, j) => j !== i),
                    })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setEditing(p => p && {
                  ...p, addresses: [...(p.addresses || []), ''],
                })}
              >
                <Plus size={14} /> Adicionar endereco
              </button>
            </div>
            <div className="printer-actions" style={{ marginTop: 'var(--space-3)' }}>
              {editing.id && (
                <button className="btn btn-danger" onClick={remove}>Excluir</button>
              )}
              <button className="btn btn-accent" onClick={save}>Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
