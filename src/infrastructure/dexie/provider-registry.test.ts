import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from './dexie-database';
import { getDatabase } from './provider-registry';

describe('getDatabase', () => {
  it('returns a PDVDatabase instance', () => {
    globalThis.indexedDB = new IDBFactory();
    expect(getDatabase()).toBeInstanceOf(PDVDatabase);
  });

  it('reuses the same instance on subsequent calls', () => {
    expect(getDatabase()).toBe(getDatabase());
  });
});
