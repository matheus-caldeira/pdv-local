import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';

export type BackupEntity = 'products' | 'orders' | 'sessions' | 'cashMovements';

export type BackupFormat = 'json' | 'csv';

export interface BackupRepository {
  exportAll(format: BackupFormat): Promise<Either<InfrastructureError, void>>;
  exportEntity(
    entity: BackupEntity,
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>>;
  importEntity(
    entity: BackupEntity,
    file: File,
  ): Promise<Either<InfrastructureError, number>>;
  wipeAll(): Promise<Either<InfrastructureError, void>>;
}
