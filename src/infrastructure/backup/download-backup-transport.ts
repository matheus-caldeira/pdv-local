import { right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { BackupTransport } from '../../domain/backup/backup.transport';

export class DownloadBackupTransport implements BackupTransport {
  async send(
    fileName: string,
    content: string,
  ): Promise<Either<AppError, void>> {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return right(undefined);
  }
}
