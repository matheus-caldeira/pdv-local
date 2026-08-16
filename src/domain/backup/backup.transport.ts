import type { Either } from '../shared/either';
import type { AppError } from '../shared/errors';

export interface BackupTransport {
  send(fileName: string, content: string): Promise<Either<AppError, void>>;
}
