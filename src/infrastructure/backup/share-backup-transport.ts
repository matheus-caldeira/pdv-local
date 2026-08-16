import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { BackupTransport } from '../../domain/backup/backup.transport';
import {
  BackupFailedError,
  BackupTransportUnavailableError,
} from '../../domain/errors';

interface ShareCapableNavigator {
  share?: (data: { files: File[] }) => Promise<void>;
  canShare?: (data: { files: File[] }) => boolean;
}

export class ShareBackupTransport implements BackupTransport {
  async send(
    fileName: string,
    content: string,
  ): Promise<Either<AppError, void>> {
    const nav = navigator as unknown as ShareCapableNavigator;
    const file = new File([content], fileName, { type: 'application/json' });

    if (!nav.share || !nav.canShare?.({ files: [file] })) {
      return left(new BackupTransportUnavailableError());
    }

    try {
      await nav.share({ files: [file] });
      return right(undefined);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') {
        return right(undefined);
      }
      return left(new BackupFailedError());
    }
  }
}
