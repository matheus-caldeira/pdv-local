import { left, right, type Either } from '../../../domain/shared/either';
import type {
  BackupEntity,
  BackupFormat,
  BackupRepository,
  BackupSnapshot,
} from '../../../domain/backup/backup.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

type Row = Record<string, unknown>;

const CSV_ENTITIES: BackupEntity[] = [
  'products',
  'orders',
  'sessions',
  'cashMovements',
];

const DATA_TABLES = [
  'products',
  'orders',
  'sessions',
  'cashMovements',
  'customers',
  'customizationGroups',
  'customizationItems',
] as const;

const SNAPSHOT_TABLES: (keyof BackupSnapshot)[] = [
  'products',
  'orders',
  'sessions',
  'cashMovements',
  'config',
  'customers',
  'customizationGroups',
  'customizationItems',
];

export interface FileSaver {
  save(content: string, filename: string, type: string): void;
}

export class DexieBackupRepository implements BackupRepository {
  private readonly db: PDVDatabase;
  private readonly saver: FileSaver;

  constructor(db: PDVDatabase, saver: FileSaver) {
    this.db = db;
    this.saver = saver;
  }

  async exportAll(
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      const data = {
        products: await this.db.products.toArray(),
        orders: await this.db.orders.toArray(),
        sessions: await this.db.sessions.toArray(),
        cashMovements: await this.db.cashMovements.toArray(),
        config: await this.db.config.toArray(),
        exportedAt: Date.now(),
        version: 1,
      };
      if (format === 'json') {
        this.saver.save(
          JSON.stringify(data, null, 2),
          'pdv-backup.json',
          'application/json',
        );
      } else {
        for (const entity of CSV_ENTITIES) {
          const items = data[entity] as unknown as Row[];
          if (items.length > 0) {
            this.saver.save(toCsv(items), `pdv-${entity}.csv`, 'text/csv');
          }
        }
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async exportEntity(
    entity: BackupEntity,
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      const items = (await this.db.table(entity).toArray()) as Row[];
      if (format === 'json') {
        this.saver.save(
          JSON.stringify(items, null, 2),
          `pdv-${entity}.json`,
          'application/json',
        );
      } else if (items.length > 0) {
        this.saver.save(toCsv(items), `pdv-${entity}.csv`, 'text/csv');
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async importEntity(
    entity: BackupEntity,
    file: File,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const text = await file.text();
      const items = file.name.endsWith('.csv')
        ? parseCsv(text)
        : extractItems(JSON.parse(text), entity);
      const cleaned = items.map((item) => {
        const copy = { ...item };
        delete copy.id;
        return copy;
      });
      await this.db.table(entity).bulkAdd(cleaned);
      return right(cleaned.length);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async hasData(): Promise<Either<InfrastructureError, boolean>> {
    try {
      const counts = await Promise.all(
        DATA_TABLES.map((table) => this.db.table(table).count()),
      );
      return right(counts.some((count) => count > 0));
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async importDemo(
    data: BackupSnapshot,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.transaction('rw', this.db.tables, async () => {
        await Promise.all(this.db.tables.map((table) => table.clear()));
        for (const name of SNAPSHOT_TABLES) {
          const items = data[name];
          if (items && items.length > 0) {
            await this.db.table(name).bulkPut(items);
          }
        }
      });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async wipeAll(): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.transaction('rw', this.db.tables, async () => {
        await Promise.all(this.db.tables.map((table) => table.clear()));
      });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}

function extractItems(parsed: unknown, entity: BackupEntity): Row[] {
  if (Array.isArray(parsed)) return parsed as Row[];
  const record = parsed as Record<string, unknown>;
  return (record[entity] as Row[] | undefined) ?? [];
}

function toCsv(items: Row[]): string {
  const headers = Object.keys(items[0]);
  const rows = items.map((item) =>
    headers.map((header) => encodeCell(item[header])).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function encodeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }
  const text = String(value);
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text: string): Row[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Row = {};
    headers.forEach((header, index) => {
      row[header] = decodeCell(values[index]?.trim() ?? '');
    });
    return row;
  });
}

function decodeCell(value: string): unknown {
  if (value.startsWith('"') && value.endsWith('"')) {
    const unquoted = value.slice(1, -1).replace(/""/g, '"');
    try {
      return JSON.parse(unquoted);
    } catch {
      return unquoted;
    }
  }
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}
