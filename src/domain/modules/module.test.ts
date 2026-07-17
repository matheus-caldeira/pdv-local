import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import {
  ALL_MODULE_IDS,
  isModuleId,
  resolveEnabledModules,
  validateModuleSelection,
} from './module';

describe('isModuleId', () => {
  it('accepts known module ids', () => {
    expect(ALL_MODULE_IDS.every(isModuleId)).toBe(true);
  });

  it('rejects unknown ids', () => {
    expect(isModuleId('stock')).toBe(false);
    expect(isModuleId('')).toBe(false);
  });
});

describe('resolveEnabledModules', () => {
  it('keeps a stored valid selection without persisting', () => {
    expect(resolveEnabledModules(['finance'], true)).toEqual({
      modules: ['finance'],
      needsFirstRun: false,
      shouldPersist: false,
    });
  });

  it('drops unknown ids from a stored selection', () => {
    expect(resolveEnabledModules(['pdv', 'stock'], false)).toEqual({
      modules: ['pdv'],
      needsFirstRun: false,
      shouldPersist: false,
    });
  });

  it('migrates silently to pdv when there is sales data', () => {
    expect(resolveEnabledModules([], true)).toEqual({
      modules: ['pdv'],
      needsFirstRun: false,
      shouldPersist: true,
    });
  });

  it('asks for first run when empty and without sales data', () => {
    expect(resolveEnabledModules([], false)).toEqual({
      modules: [],
      needsFirstRun: true,
      shouldPersist: false,
    });
  });

  it('treats a selection with only unknown ids as empty', () => {
    expect(resolveEnabledModules(['stock'], false).needsFirstRun).toBe(true);
  });
});

describe('validateModuleSelection', () => {
  it('returns the typed selection when valid', () => {
    const result = validateModuleSelection(['pdv', 'finance']);
    expect(isRight(result) && result.right).toEqual(['pdv', 'finance']);
  });

  it('fails with modules/last-module-disabled on empty selection', () => {
    const result = validateModuleSelection([]);
    expect(isLeft(result) && result.left.code).toBe(
      'modules/last-module-disabled',
    );
  });

  it('fails with modules/unknown-module on unknown id', () => {
    const result = validateModuleSelection(['pdv', 'stock']);
    expect(isLeft(result) && result.left.code).toBe('modules/unknown-module');
  });

  it('deduplicates repeated ids', () => {
    const result = validateModuleSelection(['pdv', 'pdv']);
    expect(isRight(result) && result.right).toEqual(['pdv']);
  });
});
