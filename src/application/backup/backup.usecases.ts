import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  BackupEntity,
  BackupFormat,
  BackupRepository,
} from '../../domain/backup/backup.repository';
import { generateDemoSeed } from '../../domain/demo/demo-seed';

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

export function makeHasData(repository: BackupRepository) {
  return (): Promise<Either<AppError, boolean>> => repository.hasData();
}

export function makeLoadDemo(repository: BackupRepository) {
  return (now: number): Promise<Either<AppError, void>> =>
    repository.importDemo(generateDemoSeed(now));
}

export function makeWipeData(repository: BackupRepository) {
  return (): Promise<Either<AppError, void>> => repository.wipeAll();
}
