import { describe, expect, it } from 'vitest';
import { isRight, right, type Either } from '../../domain/shared/either';
import type {
  BackupEntity,
  BackupFormat,
  BackupRepository,
  BackupSnapshot,
} from '../../domain/backup/backup.repository';
import type { InfrastructureError } from '../../infrastructure/errors';
import {
  makeExportBackup,
  makeExportEntity,
  makeHasData,
  makeImportBackup,
  makeLoadDemo,
  makeWipeData,
} from './backup.usecases';

class FakeBackupRepository implements BackupRepository {
  exportedAll: BackupFormat | null = null;
  exportedEntity: { entity: BackupEntity; format: BackupFormat } | null = null;
  imported: { entity: BackupEntity; file: File } | null = null;
  importedDemo: BackupSnapshot | null = null;
  wiped = false;

  async exportAll(
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>> {
    this.exportedAll = format;
    return right(undefined);
  }
  async exportEntity(
    entity: BackupEntity,
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>> {
    this.exportedEntity = { entity, format };
    return right(undefined);
  }
  async importEntity(
    entity: BackupEntity,
    file: File,
  ): Promise<Either<InfrastructureError, number>> {
    this.imported = { entity, file };
    return right(3);
  }
  async hasData(): Promise<Either<InfrastructureError, boolean>> {
    return right(true);
  }
  async importDemo(
    data: BackupSnapshot,
  ): Promise<Either<InfrastructureError, void>> {
    this.importedDemo = data;
    return right(undefined);
  }
  async wipeAll(): Promise<Either<InfrastructureError, void>> {
    this.wiped = true;
    return right(undefined);
  }
}

describe('backup use cases', () => {
  it('exports all data in the given format', async () => {
    const repo = new FakeBackupRepository();
    await makeExportBackup(repo)('csv');
    expect(repo.exportedAll).toBe('csv');
  });

  it('exports a single entity', async () => {
    const repo = new FakeBackupRepository();
    await makeExportEntity(repo)('products', 'json');
    expect(repo.exportedEntity).toEqual({ entity: 'products', format: 'json' });
  });

  it('imports an entity from a file', async () => {
    const repo = new FakeBackupRepository();
    const file = new File(['[]'], 'pdv-products.json');
    const result = await makeImportBackup(repo)('products', file);
    expect(isRight(result) && result.right).toBe(3);
    expect(repo.imported?.entity).toBe('products');
  });

  it('wipes all data', async () => {
    const repo = new FakeBackupRepository();
    await makeWipeData(repo)();
    expect(repo.wiped).toBe(true);
  });

  it('checks whether there is data', async () => {
    const repo = new FakeBackupRepository();
    const result = await makeHasData(repo)();
    expect(isRight(result) && result.right).toBe(true);
  });

  it('generates and imports a demo snapshot for the given time', async () => {
    const repo = new FakeBackupRepository();
    const now = new Date('2026-05-28T12:00:00Z').getTime();
    await makeLoadDemo(repo)(now);
    expect(repo.importedDemo?.products?.length).toBeGreaterThan(0);
    expect(repo.importedDemo?.orders?.length).toBeGreaterThan(0);
  });
});
