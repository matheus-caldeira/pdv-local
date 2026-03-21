import { useState, useEffect, useRef } from 'react'
import { Download, Upload, Store } from 'lucide-react'
import { db, type BusinessConfig } from '../db/database'
import { exportAll, exportEntity, importEntity } from '../db/export-import'
import { useToast } from '../components/Toast'
import './Settings.css'

const ENTITIES = [
  { key: 'products', label: 'Produtos' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'sessions', label: 'Sessoes' },
  { key: 'cashMovements', label: 'Movimentacoes' },
] as const

export function Settings() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [config, setConfig] = useState<Partial<BusinessConfig>>({
    name: '', document: '', phone: '', address: '',
  })
  const [importTarget, setImportTarget] = useState<string>('products')

  useEffect(() => {
    db.config.toArray().then(all => {
      if (all.length > 0) setConfig(all[0])
    })
  }, [])

  async function saveConfig() {
    const data: BusinessConfig = {
      ...config as BusinessConfig,
      name: config.name?.trim() || '',
      document: config.document?.trim() || '',
      phone: config.phone?.trim() || '',
      address: config.address?.trim() || '',
    }

    if (config.id) {
      await db.config.update(config.id, data)
    } else {
      const id = await db.config.add(data)
      setConfig(prev => ({ ...prev, id }))
    }
    toast('Configuracoes salvas')
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast('Selecione um arquivo', 'error')
      return
    }

    try {
      const count = await importEntity(importTarget as 'products' | 'orders' | 'sessions' | 'cashMovements', file)
      toast(`${count} registros importados`)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      toast('Erro ao importar: ' + (err as Error).message, 'error')
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Configuracoes</h1>
      </div>

      {/* Business info */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Store size={20} />
          <h2>Dados do Negocio</h2>
        </div>
        <div className="settings-card">
          <div className="form-grid">
            <div className="form-field full">
              <label>Nome do Estabelecimento</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Lanchonete do Ze"
              />
            </div>
            <div className="form-field">
              <label>CNPJ / CPF</label>
              <input
                type="text"
                value={config.document || ''}
                onChange={e => setConfig(p => ({ ...p, document: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="form-field">
              <label>Telefone</label>
              <input
                type="tel"
                value={config.phone || ''}
                onChange={e => setConfig(p => ({ ...p, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="form-field full">
              <label>Endereco</label>
              <input
                type="text"
                value={config.address || ''}
                onChange={e => setConfig(p => ({ ...p, address: e.target.value }))}
                placeholder="Rua, numero, bairro..."
              />
            </div>
          </div>
          <button className="btn btn-accent" onClick={saveConfig} style={{ marginTop: 'var(--space-4)' }}>
            Salvar
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Download size={20} />
          <h2>Exportar Dados</h2>
        </div>
        <div className="settings-card">
          <p className="settings-desc">Exporte todos os dados ou apenas uma entidade especifica.</p>
          <div className="export-buttons">
            <button className="btn btn-outline" onClick={() => exportAll('json')}>
              Exportar Tudo (JSON)
            </button>
            <button className="btn btn-outline" onClick={() => exportAll('csv')}>
              Exportar Tudo (CSV)
            </button>
          </div>
          <div className="export-individual">
            <span className="settings-sublabel">Exportar Individual:</span>
            <div className="export-entity-buttons">
              {ENTITIES.map(e => (
                <button
                  key={e.key}
                  className="btn btn-ghost btn-sm"
                  onClick={() => exportEntity(e.key, 'json')}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Upload size={20} />
          <h2>Importar Dados</h2>
        </div>
        <div className="settings-card">
          <p className="settings-desc">Importe dados de um arquivo JSON ou CSV. Selecione o tipo de dado e o arquivo.</p>
          <div className="import-controls">
            <div className="form-field">
              <label>Tipo de Dado</label>
              <select value={importTarget} onChange={e => setImportTarget(e.target.value)}>
                {ENTITIES.map(e => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Arquivo (JSON ou CSV)</label>
              <input type="file" ref={fileRef} accept=".json,.csv" />
            </div>
          </div>
          <button className="btn btn-accent" onClick={handleImport} style={{ marginTop: 'var(--space-3)' }}>
            Importar
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="settings-section">
        <div className="settings-section-header danger">
          <h2>Zona de Perigo</h2>
        </div>
        <div className="settings-card">
          <p className="settings-desc">Apagar todos os dados do sistema. Esta acao nao pode ser desfeita.</p>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm('Tem certeza? Todos os dados serao perdidos!')) return
              if (!confirm('Esta acao NAO pode ser desfeita. Continuar?')) return
              await db.delete()
              window.location.reload()
            }}
          >
            Apagar Todos os Dados
          </button>
        </div>
      </div>
    </div>
  )
}
