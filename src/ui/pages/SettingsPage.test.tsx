import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from './SettingsPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { BusinessConfig } from '../../domain/config/config.entity';

const readConfig = vi.fn();
const saveConfig = vi.fn();
const resetTicketSequence = vi.fn();
const exportBackup = vi.fn();
const exportEntity = vi.fn();
const importBackup = vi.fn();
const hasData = vi.fn();
const loadDemo = vi.fn();
const wipeData = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    readConfig: () => readConfig(),
    saveConfig: (input: unknown) => saveConfig(input),
    resetTicketSequence: (counter: number) => resetTicketSequence(counter),
    exportBackup: (format: string) => exportBackup(format),
    exportEntity: (entity: string, format: string) =>
      exportEntity(entity, format),
    importBackup: (entity: string, file: File) => importBackup(entity, file),
    hasData: () => hasData(),
    loadDemo: (now: number) => loadDemo(now),
    wipeData: () => wipeData(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const CONFIG: BusinessConfig = {
  id: 1,
  name: 'Bar do Ze',
  document: '123',
  phone: '999',
  address: 'Rua A',
  ticketCounter: 5,
  ticketLimit: 99,
  ticketAutoReset: true,
  statusControlEnabled: false,
};

function renderPage() {
  return render(
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    readConfig.mockReset();
    saveConfig.mockReset();
    resetTicketSequence.mockReset();
    exportBackup.mockReset();
    exportEntity.mockReset();
    importBackup.mockReset();
    hasData.mockReset();
    loadDemo.mockReset();
    wipeData.mockReset();
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the loaded config in the form', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Nome do Estabelecimento')).toHaveValue(
        'Bar do Ze',
      ),
    );
    expect(screen.getByLabelText('CNPJ / CPF')).toHaveValue('123');
    expect(screen.getByText('05')).toBeInTheDocument();
  });

  it('shows only the title while config is loading', () => {
    let resolve: (value: unknown) => void = () => {};
    readConfig.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();
    expect(screen.getByText('Configuracoes')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Nome do Estabelecimento'),
    ).not.toBeInTheDocument();
    resolve(right(CONFIG));
  });

  it('stays on the title screen when loading fails', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha config'),
    );
    expect(
      screen.queryByLabelText('Nome do Estabelecimento'),
    ).not.toBeInTheDocument();
  });

  it('edits the business fields and saves', async () => {
    saveConfig.mockResolvedValue(right(CONFIG));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Nome do Estabelecimento'),
      ).toBeInTheDocument(),
    );
    const name = screen.getByLabelText('Nome do Estabelecimento');
    await userEvent.clear(name);
    await userEvent.type(name, 'Novo Nome');
    const doc = screen.getByLabelText('CNPJ / CPF');
    await userEvent.clear(doc);
    await userEvent.type(doc, '999');
    const phone = screen.getByLabelText('Telefone');
    await userEvent.clear(phone);
    await userEvent.type(phone, '555');
    const address = screen.getByLabelText('Endereco');
    await userEvent.clear(address);
    await userEvent.type(address, 'Rua Nova');
    await userEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Configuracoes salvas',
      ),
    );
    expect(saveConfig).toHaveBeenCalledWith({
      name: 'Novo Nome',
      document: '999',
      phone: '555',
      address: 'Rua Nova',
      ticketLimit: 99,
      ticketAutoReset: true,
      statusControlEnabled: false,
    });
  });

  it('toasts when saving fails', async () => {
    saveConfig.mockResolvedValue(left(new FakeError('falha salvar')));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Nome do Estabelecimento'),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha salvar'),
    );
  });

  it('changes the ticket settings and shows the next ticket', async () => {
    saveConfig.mockResolvedValue(right(CONFIG));
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Reset Automatico')).toBeInTheDocument(),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Reset Automatico'),
      '0',
    );
    const limit = screen.getByLabelText(
      'Limite (define os digitos da comanda)',
    );
    await userEvent.clear(limit);
    await userEvent.type(limit, '999');
    expect(screen.getByText('005')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[1]);
    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        name: 'Bar do Ze',
        document: '123',
        phone: '999',
        address: 'Rua A',
        ticketLimit: 999,
        ticketAutoReset: false,
        statusControlEnabled: false,
      }),
    );
  });

  it('toggles status control and saves', async () => {
    saveConfig.mockResolvedValue(right(CONFIG));
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Controle de Status')).toBeInTheDocument(),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Controle de Status'),
      '1',
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[2]);
    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ statusControlEnabled: true }),
      ),
    );
  });

  it('resets the sequence through the modal', async () => {
    resetTicketSequence.mockResolvedValue(right(CONFIG));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Reiniciar a partir de'),
      ).toBeInTheDocument(),
    );
    const resetInput = screen.getByLabelText('Reiniciar a partir de');
    await userEvent.clear(resetInput);
    await userEvent.type(resetInput, '12');
    await userEvent.click(
      screen.getByRole('button', { name: 'Reiniciar Sequencia' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('12')).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reiniciar' }),
    );
    expect(resetTicketSequence).toHaveBeenCalledWith(12);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the reset modal open when reset fails', async () => {
    resetTicketSequence.mockResolvedValue(left(new FakeError('falha reset')));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Reiniciar a partir de'),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reiniciar Sequencia' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Reiniciar',
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha reset'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the reset modal via the backdrop', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Reiniciar a partir de'),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reiniciar Sequencia' }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(resetTicketSequence).not.toHaveBeenCalled();
  });

  it('cancels the reset modal', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Reiniciar a partir de'),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reiniciar Sequencia' }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(resetTicketSequence).not.toHaveBeenCalled();
  });

  it('exports all data as json and csv', async () => {
    exportBackup.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Exportar Tudo (JSON)' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar Tudo (JSON)' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar Tudo (CSV)' }),
    );
    expect(exportBackup).toHaveBeenCalledWith('json');
    expect(exportBackup).toHaveBeenCalledWith('csv');
  });

  it('exports a single entity', async () => {
    exportEntity.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Produtos' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Produtos' }));
    expect(exportEntity).toHaveBeenCalledWith('products', 'json');
  });

  it('warns when importing without a file', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Importar' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selecione um arquivo',
      ),
    );
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('clears the selection when the file input is emptied', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Arquivo (JSON ou CSV)'),
      ).toBeInTheDocument(),
    );
    const fileInput = screen.getByLabelText('Arquivo (JSON ou CSV)');
    await userEvent.upload(
      fileInput,
      new File(['x'], 'data.json', { type: 'application/json' }),
    );
    fireEvent.change(fileInput, { target: { files: [] } });
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selecione um arquivo',
      ),
    );
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('imports a selected entity and clears the input', async () => {
    importBackup.mockResolvedValue(right(4));
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Tipo de Dado')).toBeInTheDocument(),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de Dado'),
      'orders',
    );
    await userEvent.upload(
      screen.getByLabelText('Arquivo (JSON ou CSV)'),
      new File(['[]'], 'data.json', { type: 'application/json' }),
    );
    expect(
      (screen.getByLabelText('Arquivo (JSON ou CSV)') as HTMLInputElement)
        .files,
    ).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '4 registros importados',
      ),
    );
    expect(importBackup).toHaveBeenCalled();
    expect(importBackup.mock.calls[0][0]).toBe('orders');
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Arquivo (JSON ou CSV)') as HTMLInputElement)
          .files,
      ).toHaveLength(0),
    );
  });

  it('toasts when importing fails', async () => {
    importBackup.mockResolvedValue(left(new FakeError('falha import')));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Arquivo (JSON ou CSV)'),
      ).toBeInTheDocument(),
    );
    await userEvent.upload(
      screen.getByLabelText('Arquivo (JSON ou CSV)'),
      new File(['x'], 'data.json', { type: 'application/json' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha import'),
    );
  });

  it('shows printer test and save toasts', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Testar Impressao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de Conexao'),
      'usb',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Largura do Papel'),
      '58',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Imprimir Automaticamente'),
      '1',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Testar Impressao' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Funcionalidade de teste sera implementada com a lib ESC/POS',
      ),
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Salvar' }).at(-1)!,
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Configuracoes de impressao salvas',
      ),
    );
  });

  it('wipes the data after both confirmations', async () => {
    wipeData.mockResolvedValue(right(undefined));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
    );
    await waitFor(() => expect(wipeData).toHaveBeenCalled());
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(reloadSpy).toHaveBeenCalled());
  });

  it('does not reload when wiping fails', async () => {
    wipeData.mockResolvedValue(left(new FakeError('falha wipe')));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha wipe'),
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('aborts the wipe when the first confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
    );
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(wipeData).not.toHaveBeenCalled();
  });

  it('aborts the wipe when the second confirmation is cancelled', async () => {
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Apagar Todos os Dados' }),
    );
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(wipeData).not.toHaveBeenCalled();
  });

  function mockReload() {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    return reloadSpy;
  }

  it('loads the demo directly when there is no data', async () => {
    hasData.mockResolvedValue(right(false));
    loadDemo.mockResolvedValue(right(undefined));
    const reloadSpy = mockReload();
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await waitFor(() => expect(loadDemo).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(reloadSpy).toHaveBeenCalled());
  });

  it('loads the demo after both confirmations when data exists', async () => {
    hasData.mockResolvedValue(right(true));
    loadDemo.mockResolvedValue(right(undefined));
    const reloadSpy = mockReload();
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(loadDemo).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Continuar',
      }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Carregar Demonstracao',
      }),
    );
    await waitFor(() => expect(loadDemo).toHaveBeenCalled());
    await waitFor(() => expect(reloadSpy).toHaveBeenCalled());
  });

  it('aborts the demo when the first confirmation is cancelled', async () => {
    hasData.mockResolvedValue(right(true));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(loadDemo).not.toHaveBeenCalled();
  });

  it('aborts the demo when the second confirmation is cancelled', async () => {
    hasData.mockResolvedValue(right(true));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Continuar',
      }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(loadDemo).not.toHaveBeenCalled();
  });

  it('toasts when the demo load fails', async () => {
    hasData.mockResolvedValue(right(false));
    loadDemo.mockResolvedValue(left(new FakeError('falha demo')));
    const reloadSpy = mockReload();
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha demo'),
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('closes the first demo modal via the backdrop', async () => {
    hasData.mockResolvedValue(right(true));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(loadDemo).not.toHaveBeenCalled();
  });

  it('closes the second demo modal via the backdrop', async () => {
    hasData.mockResolvedValue(right(true));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Continuar',
      }),
    );
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(loadDemo).not.toHaveBeenCalled();
  });

  it('treats a failed data check as empty', async () => {
    hasData.mockResolvedValue(left(new FakeError('falha check')));
    loadDemo.mockResolvedValue(right(undefined));
    mockReload();
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar dados de demonstracao' }),
    );
    await waitFor(() => expect(loadDemo).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
