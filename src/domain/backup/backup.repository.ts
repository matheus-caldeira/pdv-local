import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';

export type BackupEntity = 'products' | 'orders' | 'sessions' | 'cashMovements';

export type BackupFormat = 'json' | 'csv';

export interface BackupSnapshot {
  products?: unknown[];
  orders?: unknown[];
  sessions?: unknown[];
  cashMovements?: unknown[];
  config?: unknown[];
  customers?: unknown[];
  customizationGroups?: unknown[];
  customizationItems?: unknown[];
}

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
  hasData(): Promise<Either<InfrastructureError, boolean>>;
  importDemo(data: BackupSnapshot): Promise<Either<InfrastructureError, void>>;
  wipeAll(): Promise<Either<InfrastructureError, void>>;
}
