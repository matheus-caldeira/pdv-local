import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupPrompt } from './BackupPrompt';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import {
  BackupFailedError,
  BackupTransportUnavailableError,
} from '../../domain/errors';

const buildBackupSnapshot = vi.fn();
const saveBackupInfo = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    buildBackupSnapshot: () => buildBackupSnapshot(),
    saveBackupInfo: (input: unknown) => saveBackupInfo(input),
  },
}));

const shareSend = vi.fn();
const downloadSend = vi.fn();

vi.mock('../../infrastructure/backup/share-backup-transport', () => ({
  ShareBackupTransport: class {
    send(fileName: string, content: string) {
      return shareSend(fileName, content);
    }
  },
}));

vi.mock('../../infrastructure/backup/download-backup-transport', () => ({
  DownloadBackupTransport: class {
    send(fileName: string, content: string) {
      return downloadSend(fileName, content);
    }
  },
}));

function renderPrompt(onClose = () => {}) {
  return render(
    <ToastProvider>
      <BackupPrompt open onClose={onClose} />
    </ToastProvider>,
  );
}

describe('BackupPrompt', () => {
  beforeEach(() => {
    buildBackupSnapshot.mockReset();
    saveBackupInfo.mockReset();
    shareSend.mockReset();
    downloadSend.mockReset();
    saveBackupInfo.mockResolvedValue(right(undefined));
    vi.stubGlobal('navigator', { canShare: () => true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not render when closed', () => {
    render(
      <ToastProvider>
        <BackupPrompt open={false} onClose={() => {}} />
      </ToastProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends the snapshot through the transport, saves the timestamps and closes', async () => {
    buildBackupSnapshot.mockResolvedValue(right('{"products":[]}'));
    shareSend.mockResolvedValue(right(undefined));
    const onClose = vi.fn();
    renderPrompt(onClose);

    await userEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));

    await waitFor(() => expect(shareSend).toHaveBeenCalled());
    expect(shareSend.mock.calls[0][0]).toMatch(
      /^meu-bolso-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );
    expect(shareSend.mock.calls[0][1]).toBe('{"products":[]}');

    await waitFor(() =>
      expect(saveBackupInfo).toHaveBeenCalledWith(
        expect.objectContaining({ lastBackupAt: expect.any(Number) }),
      ),
    );
    expect(saveBackupInfo).toHaveBeenCalledWith(
      expect.objectContaining({ lastBackupPromptAt: expect.any(Number) }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('falls back to download when share is unavailable', async () => {
    buildBackupSnapshot.mockResolvedValue(right('{}'));
    shareSend.mockResolvedValue(left(new BackupTransportUnavailableError()));
    downloadSend.mockResolvedValue(right(undefined));
    const onClose = vi.fn();
    renderPrompt(onClose);

    await userEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));

    await waitFor(() => expect(downloadSend).toHaveBeenCalled());
    await waitFor(() =>
      expect(saveBackupInfo).toHaveBeenCalledWith(
        expect.objectContaining({ lastBackupAt: expect.any(Number) }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('goes straight to download when the device has no share support', async () => {
    vi.stubGlobal('navigator', {});
    buildBackupSnapshot.mockResolvedValue(right('{}'));
    downloadSend.mockResolvedValue(right(undefined));
    renderPrompt();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));

    await waitFor(() => expect(downloadSend).toHaveBeenCalled());
    expect(shareSend).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the modal open when the transport fails', async () => {
    buildBackupSnapshot.mockResolvedValue(right('{}'));
    shareSend.mockResolvedValue(left(new BackupFailedError()));
    const onClose = vi.fn();
    renderPrompt(onClose);

    await userEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Não foi possível enviar o backup.',
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(
      saveBackupInfo.mock.calls.some(
        ([input]) => input.lastBackupAt !== undefined,
      ),
    ).toBe(false);
  });

  it('shows an error when building the snapshot fails', async () => {
    buildBackupSnapshot.mockResolvedValue(left(new BackupFailedError()));
    renderPrompt();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Não foi possível enviar o backup.',
      ),
    );
    expect(shareSend).not.toHaveBeenCalled();
  });

  it('"Depois" saves only the prompt timestamp, does not call the transport and closes', async () => {
    const onClose = vi.fn();
    renderPrompt(onClose);

    await userEvent.click(screen.getByRole('button', { name: 'Depois' }));

    await waitFor(() =>
      expect(saveBackupInfo).toHaveBeenCalledWith(
        expect.objectContaining({ lastBackupPromptAt: expect.any(Number) }),
      ),
    );
    expect(
      saveBackupInfo.mock.calls.some(
        ([input]) => input.lastBackupAt !== undefined,
      ),
    ).toBe(false);
    expect(buildBackupSnapshot).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
