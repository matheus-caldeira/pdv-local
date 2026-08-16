import { describe, expect, it } from 'vitest';
import { makeResolveActiveType } from './resolve-active-type.usecase';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import type { BusinessConfig } from '../../domain/config/config.entity';

function configRepoWith(businessTypeId: string) {
  const config: BusinessConfig = {
    name: '',
    document: '',
    phone: '',
    address: '',
    ticketCounter: 1,
    ticketLimit: 9999,
    ticketAutoReset: true,
    statusControlEnabled: false,
    businessTypeId,
    enabledModules: [],
    extra: {},
    printerDriver: 'browser',
    printerPaperWidth: 80,
    printerAutoPrintOnClose: false,
  };
  return {
    read: async (): Promise<Either<InfrastructureError, BusinessConfig>> =>
      right(config),
  };
}

describe('makeResolveActiveType', () => {
  it('resolve a definição scout', async () => {
    const resolve = makeResolveActiveType({
      configRepo: configRepoWith('scout'),
    });
    const result = await resolve();
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.id).toBe('scout');
  });
  it('falha BUSINESS_TYPE_NOT_SELECTED quando vazio', async () => {
    const resolve = makeResolveActiveType({ configRepo: configRepoWith('') });
    const result = await resolve();
    expect(isLeft(result)).toBe(true);
    if (isLeft(result))
      expect(result.left.code).toBe('BUSINESS_TYPE_NOT_SELECTED');
  });
  it('falha UNKNOWN_BUSINESS_TYPE para id desconhecido', async () => {
    const resolve = makeResolveActiveType({
      configRepo: configRepoWith('xyz'),
    });
    const result = await resolve();
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('UNKNOWN_BUSINESS_TYPE');
  });
  it('propaga a falha ao ler a config', async () => {
    const resolve = makeResolveActiveType({
      configRepo: {
        read: async (): Promise<Either<InfrastructureError, BusinessConfig>> =>
          left(new ConnectorError('falha ao ler config')),
      },
    });
    const result = await resolve();
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });
});
