import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import { useToast } from '../molecules/toast-context';
import { container } from '../../app/container';
import { fold, isLeft } from '../../domain/shared/either';
import type { BackupTransport } from '../../domain/backup/backup.transport';
import { ShareBackupTransport } from '../../infrastructure/backup/share-backup-transport';
import { DownloadBackupTransport } from '../../infrastructure/backup/download-backup-transport';

interface BackupPromptProps {
  open: boolean;
  onClose: () => void;
}

interface ShareCapableNavigator {
  canShare?: (data: { files: File[] }) => boolean;
}

function backupFileName(now: number): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `meu-bolso-backup-${year}-${month}-${day}.json`;
}

function resolveTransport(): BackupTransport {
  const nav = navigator as unknown as ShareCapableNavigator;
  return nav.canShare?.({ files: [] })
    ? new ShareBackupTransport()
    : new DownloadBackupTransport();
}

export function BackupPrompt({ open, onClose }: BackupPromptProps) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  async function markPrompted() {
    await container.saveBackupInfo({ lastBackupPromptAt: Date.now() });
  }

  async function handleLater() {
    await markPrompted();
    onClose();
  }

  async function handleSendNow() {
    setSending(true);
    try {
      const snapshot = await container.buildBackupSnapshot();
      if (isLeft(snapshot)) {
        toast(snapshot.left.message, 'error');
        return;
      }

      const fileName = backupFileName(Date.now());
      const primary = resolveTransport();
      let result = await primary.send(fileName, snapshot.right);

      if (
        isLeft(result) &&
        result.left.code === 'BACKUP_TRANSPORT_UNAVAILABLE'
      ) {
        toast(result.left.message, 'info');
        result = await new DownloadBackupTransport().send(
          fileName,
          snapshot.right,
        );
      }

      await fold(
        result,
        async (error) => {
          toast(error.message, 'error');
        },
        async () => {
          await container.saveBackupInfo({ lastBackupAt: Date.now() });
          await markPrompted();
          toast('Backup enviado!');
          onClose();
        },
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar backup do dia?">
      <p className="mb-4 text-sm text-ink-secondary">
        Envie o backup completo do seu negócio para o Google Drive, Arquivos ou
        outro app de sua preferência.
      </p>
      <div className="flex flex-col gap-2">
        <Button fullWidth onClick={handleSendNow} disabled={sending}>
          Enviar agora
        </Button>
        <Button
          fullWidth
          variant="ghost"
          onClick={handleLater}
          disabled={sending}
        >
          Depois
        </Button>
      </div>
    </Modal>
  );
}
