import { useState, useEffect, useRef } from 'react'
import { Download, Upload, Store, Printer, Hash } from 'lucide-react'
import { db, getConfig, saveConfig, TICKET_DEFAULTS, type BusinessConfig } from '../db/database'
import { exportAll, exportEntity, importEntity } from '../db/export-import'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { formatTicket } from '../utils/format'
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
    ...TICKET_DEFAULTS,
  })
  const [importTarget, setImportTarget] = useState<string>('products')
  const [resetValue, setResetValue] = useState('1')
  const [resetModalOpen, setResetModalOpen] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  async function handleSaveConfig() {
    await saveConfig({
      ...config,
      name: config.name?.trim() || '',
      document: config.document?.trim() || '',
      phone: config.phone?.trim() || '',
      address: config.address?.trim() || '',
    })
    setConfig(await getConfig())
    toast('Configuracoes salvas')
  }

  // Reinicia a sequencia de comandas a partir do valor informado.
  async function applyReset() {
    const value = Math.max(1, Math.floor(Number(resetValue) || 1))
    await saveConfig({ ticketCounter: value })
    setConfig(p => ({ ...p, ticketCounter: value }))
    setResetModalOpen(false)
    toast(`Sequencia reiniciada a partir de ${value}`)
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
          <button className="btn btn-accent" onClick={handleSaveConfig} style={{ marginTop: 'var(--space-4)' }}>
            Salvar
          </button>
        </div>
      </div>

      {/* Comandas */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Hash size={20} />
          <h2>Comandas</h2>
        </div>
        <div className="settings-card">
          <p className="settings-desc">
            A comanda e gerada automaticamente em sequencia a cada nova venda,
            com zeros a esquerda. A quantidade de digitos deriva do limite.
          </p>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-field">
              <label>Reset Automatico</label>
              <select
                value={config.ticketAutoReset ? '1' : '0'}
                onChange={e => setConfig(p => ({ ...p, ticketAutoReset: e.target.value === '1' }))}
              >
                <option value="1">Sim - reinicia ao passar do limite</option>
                <option value="0">Nao - sequencia continua sempre</option>
              </select>
            </div>
            <div className="form-field">
              <label>Limite (define os digitos da comanda)</label>
              <input
                type="number"
                min={1}
                value={config.ticketLimit ?? TICKET_DEFAULTS.ticketLimit}
                onChange={e => setConfig(p => ({ ...p, ticketLimit: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))}
              />
            </div>
          </div>
          <p className="settings-desc" style={{ marginTop: 'var(--space-3)' }}>
            Proxima comanda:{' '}
            <strong>
              {formatTicket(
                config.ticketCounter ?? TICKET_DEFAULTS.ticketCounter,
                config.ticketLimit ?? TICKET_DEFAULTS.ticketLimit,
              )}
            </strong>
          </p>
          <button className="btn btn-accent" onClick={handleSaveConfig} style={{ marginTop: 'var(--space-3)' }}>
            Salvar
          </button>

          <div className="export-individual">
            <span className="settings-sublabel">Reiniciar Sequencia:</span>
            <div className="import-controls">
              <div className="form-field">
                <label>Reiniciar a partir de</label>
                <input
                  type="number"
                  min={1}
                  value={resetValue}
                  onChange={e => setResetValue(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn btn-outline"
              onClick={() => setResetModalOpen(true)}
              style={{ marginTop: 'var(--space-3)' }}
            >
              Reiniciar Sequencia
            </button>
          </div>
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

      {/* Printer ESC/POS */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Printer size={20} />
          <h2>Impressora (ESC/POS)</h2>
        </div>
        <div className="settings-card">
          <p className="settings-desc">
            Configure uma impressora termica via USB ou Bluetooth para imprimir recibos e comandas.
            Utiliza o protocolo ESC/POS compativel com a maioria das impressoras termicas (Epson, Elgin, Bematech, etc).
          </p>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-field">
              <label>Tipo de Conexao</label>
              <select defaultValue="none">
                <option value="none">Nenhuma (desabilitado)</option>
                <option value="usb">USB (WebUSB)</option>
                <option value="bluetooth">Bluetooth (Web Bluetooth)</option>
                <option value="network">Rede (IP:Porta)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Largura do Papel</label>
              <select defaultValue="80">
                <option value="58">58mm</option>
                <option value="80">80mm</option>
              </select>
            </div>
            <div className="form-field">
              <label>Imprimir Automaticamente</label>
              <select defaultValue="0">
                <option value="0">Nao - apenas manual</option>
                <option value="1">Sim - ao fechar pedido</option>
              </select>
            </div>
          </div>
          <div className="printer-actions">
            <button className="btn btn-outline" onClick={() => toast('Funcionalidade de teste sera implementada com a lib ESC/POS', 'info')}>
              Testar Impressao
            </button>
            <button className="btn btn-accent" onClick={() => toast('Configuracoes de impressao salvas')}>
              Salvar
            </button>
          </div>
          <div className="printer-info">
            <p>Libs compativeis: <strong>escpos-buffer</strong>, <strong>node-escpos</strong>, <strong>WebUSB API</strong></p>
            <p>Para conectar via USB, o navegador precisa suportar WebUSB (Chrome/Edge).</p>
          </div>
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

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reiniciar sequencia de comandas"
      >
        <p className="settings-desc">
          A proxima comanda passara a ser{' '}
          <strong>
            {formatTicket(
              Math.max(1, Math.floor(Number(resetValue) || 1)),
              config.ticketLimit ?? TICKET_DEFAULTS.ticketLimit,
            )}
          </strong>
          . Pedidos ja registrados nao sao afetados.
        </p>
        <div className="printer-actions" style={{ marginTop: 'var(--space-4)' }}>
          <button className="btn btn-ghost" onClick={() => setResetModalOpen(false)}>
            Cancelar
          </button>
          <button className="btn btn-accent" onClick={applyReset}>
            Reiniciar
          </button>
        </div>
      </Modal>
    </div>
  )
}
