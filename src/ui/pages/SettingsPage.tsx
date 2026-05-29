import { useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Download,
  Upload,
  Store,
  Printer,
  Hash,
  ClipboardList,
  Database,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import { FormField } from '../molecules/FormField';
import { TextField } from '../molecules/TextField';
import { Select } from '../molecules/Select';
import { useToast } from '../molecules/toast-context';
import { useSettings } from '../hooks/useSettings';
import { formatTicket } from '../../domain/config/config.rules';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { BackupEntity } from '../../domain/backup/backup.repository';

interface FormState {
  name: string;
  document: string;
  phone: string;
  address: string;
  ticketCounter: number;
  ticketLimit: string;
  ticketAutoReset: boolean;
  statusControlEnabled: boolean;
}

const ENTITIES: { key: BackupEntity; label: string }[] = [
  { key: 'products', label: 'Produtos' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'sessions', label: 'Sessoes' },
  { key: 'cashMovements', label: 'Movimentacoes' },
];

function toFormState(config: BusinessConfig): FormState {
  return {
    name: config.name,
    document: config.document,
    phone: config.phone,
    address: config.address,
    ticketCounter: config.ticketCounter,
    ticketLimit: String(config.ticketLimit),
    ticketAutoReset: config.ticketAutoReset,
    statusControlEnabled: config.statusControlEnabled,
  };
}

function Section({
  icon,
  title,
  danger,
  children,
}: {
  icon?: ReactNode;
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div
        className={
          danger
            ? 'flex items-center gap-2 text-danger'
            : 'flex items-center gap-2 text-ink-secondary'
        }
      >
        {icon}
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4">
        {children}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const toast = useToast();
  const {
    config,
    save,
    resetSequence,
    exportAll,
    exportOne,
    importOne,
    checkHasData,
    importDemo,
    wipe,
  } = useSettings();
  const [form, setForm] = useState<FormState | null>(null);
  const [importTarget, setImportTarget] = useState<BackupEntity>('products');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [resetValue, setResetValue] = useState('1');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [demoConfirmStep, setDemoConfirmStep] = useState<0 | 1 | 2>(0);
  const [seenConfig, setSeenConfig] = useState<BusinessConfig | null>(null);

  if (config && config !== seenConfig) {
    setSeenConfig(config);
    setForm(toFormState(config));
  }

  if (!form) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Configuracoes
        </h1>
      </div>
    );
  }

  const current = form;

  function buildInput(state: FormState) {
    return {
      name: state.name,
      document: state.document,
      phone: state.phone,
      address: state.address,
      ticketLimit: Number(state.ticketLimit),
      ticketAutoReset: state.ticketAutoReset,
      statusControlEnabled: state.statusControlEnabled,
    };
  }

  function handleSave() {
    save(buildInput(current));
  }

  async function handleReset() {
    const ok = await resetSequence(Number(resetValue));
    if (ok) setResetModalOpen(false);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImportFile(event.target.files?.[0] ?? null);
  }

  async function handleImport() {
    if (!importFile) {
      toast('Selecione um arquivo', 'error');
      return;
    }
    const ok = await importOne(importTarget, importFile);
    if (ok) {
      setImportFile(null);
      setFileKey((k) => k + 1);
    }
  }

  async function handleWipe() {
    if (!window.confirm('Tem certeza? Todos os dados serao perdidos!')) return;
    if (!window.confirm('Esta acao NAO pode ser desfeita. Continuar?')) return;
    const ok = await wipe();
    if (ok) window.location.reload();
  }

  async function runDemoImport() {
    setDemoConfirmStep(0);
    const ok = await importDemo();
    if (ok) window.location.reload();
  }

  async function handleDemoClick() {
    const populated = await checkHasData();
    if (populated) {
      setDemoConfirmStep(1);
      return;
    }
    await runDemoImport();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Configuracoes</h1>

      <Section icon={<Store size={20} />} title="Dados do Negocio">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Nome do Estabelecimento" className="sm:col-span-2">
            <TextField
              value={form.name}
              onChange={(e) =>
                setForm((p) => p && { ...p, name: e.target.value })
              }
              placeholder="Ex: Lanchonete do Ze"
            />
          </FormField>
          <FormField label="CNPJ / CPF">
            <TextField
              value={form.document}
              onChange={(e) =>
                setForm((p) => p && { ...p, document: e.target.value })
              }
              placeholder="00.000.000/0000-00"
            />
          </FormField>
          <FormField label="Telefone">
            <TextField
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => p && { ...p, phone: e.target.value })
              }
              placeholder="(00) 00000-0000"
            />
          </FormField>
          <FormField label="Endereco" className="sm:col-span-2">
            <TextField
              value={form.address}
              onChange={(e) =>
                setForm((p) => p && { ...p, address: e.target.value })
              }
              placeholder="Rua, numero, bairro..."
            />
          </FormField>
        </div>
        <Button className="self-start" onClick={handleSave}>
          Salvar
        </Button>
      </Section>

      <Section icon={<Hash size={20} />} title="Comandas">
        <p className="text-sm text-ink-tertiary">
          A comanda e gerada automaticamente em sequencia a cada nova venda, com
          zeros a esquerda. A quantidade de digitos deriva do limite.
        </p>
        <FormField label="Reset Automatico">
          <Select
            value={form.ticketAutoReset ? '1' : '0'}
            onChange={(e) =>
              setForm(
                (p) => p && { ...p, ticketAutoReset: e.target.value === '1' },
              )
            }
          >
            <option value="1">Sim - reinicia ao passar do limite</option>
            <option value="0">Nao - sequencia continua sempre</option>
          </Select>
        </FormField>
        <FormField label="Limite (define os digitos da comanda)">
          <TextField
            type="number"
            min={1}
            value={form.ticketLimit}
            onChange={(e) =>
              setForm((p) => p && { ...p, ticketLimit: e.target.value })
            }
          />
        </FormField>
        <p className="text-sm text-ink-tertiary">
          Proxima comanda:{' '}
          <strong className="font-mono tabular-nums text-ink-primary">
            {formatTicket(form.ticketCounter, Number(form.ticketLimit))}
          </strong>
        </p>
        <Button className="self-start" onClick={handleSave}>
          Salvar
        </Button>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
            Reiniciar Sequencia
          </span>
          <FormField label="Reiniciar a partir de">
            <TextField
              type="number"
              min={1}
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
            />
          </FormField>
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => setResetModalOpen(true)}
          >
            Reiniciar Sequencia
          </Button>
        </div>
      </Section>

      <Section icon={<ClipboardList size={20} />} title="Pedidos">
        <p className="text-sm text-ink-tertiary">
          O controle de status acompanha o preparo de cada pedido por estagios
          (aceito, em preparo, a caminho, finalizado) e habilita as telas de
          gestao (KDS) e o painel publico.
        </p>
        <FormField label="Controle de Status">
          <Select
            value={form.statusControlEnabled ? '1' : '0'}
            onChange={(e) =>
              setForm(
                (p) =>
                  p && { ...p, statusControlEnabled: e.target.value === '1' },
              )
            }
          >
            <option value="0">Desligado</option>
            <option value="1">Ligado - habilita KDS e painel</option>
          </Select>
        </FormField>
        <Button className="self-start" onClick={handleSave}>
          Salvar
        </Button>
      </Section>

      <Section icon={<Download size={20} />} title="Exportar Dados">
        <p className="text-sm text-ink-tertiary">
          Exporte todos os dados ou apenas uma entidade especifica.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => exportAll('json')}>
            Exportar Tudo (JSON)
          </Button>
          <Button variant="ghost" onClick={() => exportAll('csv')}>
            Exportar Tudo (CSV)
          </Button>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
            Exportar Individual
          </span>
          <div className="flex flex-wrap gap-2">
            {ENTITIES.map((e) => (
              <Button
                key={e.key}
                variant="ghost"
                size="sm"
                onClick={() => exportOne(e.key, 'json')}
              >
                {e.label}
              </Button>
            ))}
          </div>
        </div>
      </Section>

      <Section icon={<Upload size={20} />} title="Importar Dados">
        <p className="text-sm text-ink-tertiary">
          Importe dados de um arquivo JSON ou CSV. Selecione o tipo de dado e o
          arquivo.
        </p>
        <FormField label="Tipo de Dado">
          <Select
            value={importTarget}
            onChange={(e) => setImportTarget(e.target.value as BackupEntity)}
          >
            {ENTITIES.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Arquivo (JSON ou CSV)">
          <input
            key={fileKey}
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="min-h-[38px] w-full rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
          />
        </FormField>
        <Button className="self-start" onClick={handleImport}>
          Importar
        </Button>
      </Section>

      <Section icon={<Database size={20} />} title="Demonstracao">
        <p className="text-sm text-ink-tertiary">
          Carregue um conjunto de dados de exemplo (produtos, vendas e caixa)
          para experimentar o sistema. Isto substitui todos os dados atuais.
        </p>
        <Button
          variant="ghost"
          className="self-start"
          onClick={handleDemoClick}
        >
          Carregar dados de demonstracao
        </Button>
      </Section>

      <Section icon={<Printer size={20} />} title="Impressora (ESC/POS)">
        <p className="text-sm text-ink-tertiary">
          Configure uma impressora termica via USB ou Bluetooth para imprimir
          recibos e comandas. Utiliza o protocolo ESC/POS compativel com a
          maioria das impressoras termicas (Epson, Elgin, Bematech, etc).
        </p>
        <FormField label="Tipo de Conexao">
          <Select defaultValue="none">
            <option value="none">Nenhuma (desabilitado)</option>
            <option value="usb">USB (WebUSB)</option>
            <option value="bluetooth">Bluetooth (Web Bluetooth)</option>
            <option value="network">Rede (IP:Porta)</option>
          </Select>
        </FormField>
        <FormField label="Largura do Papel">
          <Select defaultValue="80">
            <option value="58">58mm</option>
            <option value="80">80mm</option>
          </Select>
        </FormField>
        <FormField label="Imprimir Automaticamente">
          <Select defaultValue="0">
            <option value="0">Nao - apenas manual</option>
            <option value="1">Sim - ao fechar pedido</option>
          </Select>
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              toast(
                'Funcionalidade de teste sera implementada com a lib ESC/POS',
                'info',
              )
            }
          >
            Testar Impressao
          </Button>
          <Button onClick={() => toast('Configuracoes de impressao salvas')}>
            Salvar
          </Button>
        </div>
      </Section>

      <Section title="Zona de Perigo" danger>
        <p className="text-sm text-ink-tertiary">
          Apagar todos os dados do sistema. Esta acao nao pode ser desfeita.
        </p>
        <Button variant="danger" className="self-start" onClick={handleWipe}>
          Apagar Todos os Dados
        </Button>
      </Section>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reiniciar sequencia de comandas"
      >
        <p className="text-sm text-ink-secondary">
          A proxima comanda passara a ser{' '}
          <strong className="font-mono tabular-nums text-ink-primary">
            {formatTicket(Number(resetValue), Number(form.ticketLimit))}
          </strong>
          . Pedidos ja registrados nao sao afetados.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setResetModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleReset}>Reiniciar</Button>
        </div>
      </Modal>

      <Modal
        open={demoConfirmStep === 1}
        onClose={() => setDemoConfirmStep(0)}
        title="Carregar dados de demonstracao"
      >
        <p className="text-sm text-ink-secondary">
          Isto vai <strong className="text-ink-primary">apagar</strong> todos os
          dados atuais e substitui-los pelos dados de demonstracao.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDemoConfirmStep(0)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => setDemoConfirmStep(2)}>
            Continuar
          </Button>
        </div>
      </Modal>

      <Modal
        open={demoConfirmStep === 2}
        onClose={() => setDemoConfirmStep(0)}
        title="Esta acao nao pode ser desfeita"
      >
        <p className="text-sm text-ink-secondary">
          Os dados atuais serao perdidos permanentemente. Tem certeza que deseja
          carregar a demonstracao?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDemoConfirmStep(0)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={runDemoImport}>
            Carregar Demonstracao
          </Button>
        </div>
      </Modal>
    </div>
  );
}
