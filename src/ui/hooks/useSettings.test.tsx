import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSettings } from './useSettings';
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
    wipeData: () => wipeData(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const CONFIG: BusinessConfig = {
  id: 1,
  name: 'Bar',
  document: '123',
  phone: '999',
  address: 'Rua A',
  ticketCounter: 5,
  ticketLimit: 99,
  ticketAutoReset: true,
  statusControlEnabled: false,
};

const INPUT = {
  name: 'Bar',
  document: '123',
  phone: '999',
  address: 'Rua A',
  ticketLimit: 99,
  ticketAutoReset: true,
  statusControlEnabled: false,
};

function Probe() {
  const { config, save, resetSequence, exportAll, exportOne, importOne, wipe } =
    useSettings();
  return (
    <div>
      <span>has:{config ? 'yes' : 'no'}</span>
      <button onClick={() => save(INPUT)}>save</button>
      <button onClick={() => resetSequence(7)}>reset</button>
      <button onClick={() => exportAll('json')}>export-all</button>
      <button onClick={() => exportOne('products', 'json')}>export-one</button>
      <button
        onClick={() =>
          importOne(
            'orders',
            new File(['[]'], 'x.json', { type: 'application/json' }),
          )
        }
      >
        import-one
      </button>
      <button onClick={() => wipe()}>wipe</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe('useSettings', () => {
  beforeEach(() => {
    readConfig.mockReset();
    saveConfig.mockReset();
    resetTicketSequence.mockReset();
    exportBackup.mockReset();
    exportEntity.mockReset();
    importBackup.mockReset();
    wipeData.mockReset();
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(cleanup);

  it('loads the config on mount', async () => {
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(screen.getByText('has:yes')).toBeInTheDocument();
  });

  it('toasts when loading fails', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha config'),
    );
    expect(screen.getByText('has:no')).toBeInTheDocument();
  });

  it('saves and refreshes', async () => {
    saveConfig.mockResolvedValue(right(CONFIG));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('save'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Configuracoes salvas',
      ),
    );
    expect(saveConfig).toHaveBeenCalledWith(INPUT);
    expect(readConfig).toHaveBeenCalledTimes(2);
  });

  it('toasts when saving fails', async () => {
    saveConfig.mockResolvedValue(left(new FakeError('falha salvar')));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('save'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha salvar'),
    );
    expect(readConfig).toHaveBeenCalledTimes(1);
  });

  it('resets the sequence and refreshes', async () => {
    resetTicketSequence.mockResolvedValue(right(CONFIG));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('reset'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Sequencia reiniciada a partir de 7',
      ),
    );
    expect(resetTicketSequence).toHaveBeenCalledWith(7);
    expect(readConfig).toHaveBeenCalledTimes(2);
  });

  it('toasts when resetting fails', async () => {
    resetTicketSequence.mockResolvedValue(left(new FakeError('falha reset')));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('reset'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha reset'),
    );
    expect(readConfig).toHaveBeenCalledTimes(1);
  });

  it('exports all', async () => {
    exportBackup.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('export-all'));
    await waitFor(() => expect(exportBackup).toHaveBeenCalledWith('json'));
  });

  it('toasts when exporting all fails', async () => {
    exportBackup.mockResolvedValue(left(new FakeError('falha export')));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('export-all'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha export'),
    );
  });

  it('exports a single entity', async () => {
    exportEntity.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('export-one'));
    await waitFor(() =>
      expect(exportEntity).toHaveBeenCalledWith('products', 'json'),
    );
  });

  it('toasts when exporting a single entity fails', async () => {
    exportEntity.mockResolvedValue(left(new FakeError('falha entidade')));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('export-one'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha entidade'),
    );
  });

  it('imports an entity', async () => {
    importBackup.mockResolvedValue(right(3));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('import-one'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '3 registros importados',
      ),
    );
    expect(importBackup).toHaveBeenCalled();
  });

  it('toasts when importing fails', async () => {
    importBackup.mockResolvedValue(left(new FakeError('falha import')));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('import-one'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha import'),
    );
  });

  it('wipes the data', async () => {
    wipeData.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('wipe'));
    await waitFor(() => expect(wipeData).toHaveBeenCalled());
  });

  it('toasts when wiping fails', async () => {
    wipeData.mockResolvedValue(left(new FakeError('falha wipe')));
    renderProbe();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByText('wipe'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha wipe'),
    );
  });
});
