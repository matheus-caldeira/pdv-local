import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  BackupEntity,
  BackupFormat,
  BackupRepository,
} from '../../domain/backup/backup.repository';

export function makeExportBackup(repository: BackupRepository) {
  return (format: BackupFormat): Promise<Either<AppError, void>> =>
    repository.exportAll(format);
}

export function makeExportEntity(repository: BackupRepository) {
  return (
    entity: BackupEntity,
    format: BackupFormat,
  ): Promise<Either<AppError, void>> => repository.exportEntity(entity, format);
}

export function makeImportBackup(repository: BackupRepository) {
  return (
    entity: BackupEntity,
    file: File,
  ): Promise<Either<AppError, number>> => repository.importEntity(entity, file);
}

export function makeWipeData(repository: BackupRepository) {
  return (): Promise<Either<AppError, void>> => repository.wipeAll();
}
