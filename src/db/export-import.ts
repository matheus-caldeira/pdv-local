import { db } from './database';

type EntityName =
  | 'products'
  | 'orders'
  | 'sessions'
  | 'cashMovements'
  | 'config';

export async function exportAll(format: 'json' | 'csv' = 'json') {
  const data = {
    products: await db.products.toArray(),
    orders: await db.orders.toArray(),
    sessions: await db.sessions.toArray(),
    cashMovements: await db.cashMovements.toArray(),
    config: await db.config.toArray(),
    exportedAt: Date.now(),
    version: 1,
  };

  if (format === 'json') {
    downloadFile(
      JSON.stringify(data, null, 2),
      'pdv-backup.json',
      'application/json',
    );
  } else {
    for (const key of [
      'products',
      'orders',
      'sessions',
      'cashMovements',
    ] as const) {
      const items = data[key];
      if (items.length > 0) {
        downloadFile(
          toCsv(items as unknown as Record<string, unknown>[]),
          `pdv-${key}.csv`,
          'text/csv',
        );
      }
    }
  }
}

export async function exportEntity(
  entity: EntityName,
  format: 'json' | 'csv' = 'json',
) {
  const items = await db.table(entity).toArray();
  const filename = `pdv-${entity}`;

  if (format === 'json') {
    downloadFile(
      JSON.stringify(items, null, 2),
      `${filename}.json`,
      'application/json',
    );
  } else {
    if (items.length > 0) {
      downloadFile(toCsv(items), `${filename}.csv`, 'text/csv');
    }
  }
}

export async function importEntity(
  entity: EntityName,
  file: File,
): Promise<number> {
  const text = await file.text();
  let items: Record<string, unknown>[];

  if (file.name.endsWith('.csv')) {
    items = parseCsv(text);
  } else {
    const parsed = JSON.parse(text);
    items = Array.isArray(parsed) ? parsed : parsed[entity] || [];
  }

  // Remove IDs to let Dexie auto-increment
  const cleaned = items.map((item) => {
    const { id, ...rest } = item;
    return rest;
  });

  await db.table(entity).bulkAdd(cleaned);
  return cleaned.length;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(items: Record<string, unknown>[]): string {
  if (items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map((item) =>
    headers
      .map((h) => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object')
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      let val: unknown = values[i]?.trim() || '';
      if (typeof val === 'string') {
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
          try {
            val = JSON.parse(val as string);
          } catch {
            /* keep as string */
          }
        } else if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        }
      }
      obj[h] = val;
    });
    return obj;
  });
}
