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

interface CsvField {
  value: string;
  quoted: boolean;
}

function tokenizeCsv(text: string): CsvField[][] {
  const records: CsvField[][] = [];
  let record: CsvField[] = [];
  let field = '';
  let wasQuoted = false;
  let inQuotes = false;
  let index = 0;

  const pushField = () => {
    record.push({ value: field, quoted: wasQuoted });
    field = '';
    wasQuoted = false;
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      wasQuoted = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      index += 1;
      continue;
    }
    if (char === '\r') {
      index += 1;
      continue;
    }
    if (char === '\n') {
      pushRecord();
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (record.length > 0 || field !== '' || wasQuoted) {
    pushRecord();
  }
  return records;
}

function parseCsv(text: string): Row[] {
  const records = tokenizeCsv(text.replace(/\r\n/g, '\n').replace(/\n+$/, ''));
  if (records.length < 2) return [];
  const headers = records[0].map((field) => field.value.trim());
  return records.slice(1).map((record) => {
    const row: Row = {};
    headers.forEach((header, index) => {
      const field = record[index];
      row[header] = field ? decodeCell(field) : '';
    });
    return row;
  });
}

function decodeCell(field: CsvField): unknown {
  if (field.quoted) {
    try {
      return JSON.parse(field.value);
    } catch {
      return field.value;
    }
  }
  const value = field.value;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}
