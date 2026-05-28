import { describe, expect, it } from 'vitest';
import { isRight, right, type Either } from '../../domain/shared/either';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';
import type { InfrastructureError } from '../../infrastructure/errors';
import {
  makeReadConfig,
  makeResetTicketSequence,
  makeSaveConfig,
  type ConfigInput,
} from './config.usecases';

const config: BusinessConfig = {
  id: 1,
  name: 'Bar',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
  statusControlEnabled: true,
};

class FakeConfigRepository implements ConfigRepository {
  saved: Partial<BusinessConfig> | null = null;

  async read(): Promise<Either<InfrastructureError, BusinessConfig>> {
    return right(config);
  }
  async claimTicket(): Promise<Either<InfrastructureError, string>> {
    return right('0001');
  }
  async save(
    patch: Partial<BusinessConfig>,
  ): Promise<Either<InfrastructureError, BusinessConfig>> {
    this.saved = patch;
    return right({ ...config, ...patch });
  }
}

const input = (over: Partial<ConfigInput> = {}): ConfigInput => ({
  name: '  Bar  ',
  document: '  12  ',
  phone: '  99  ',
  address: '  Rua  ',
  ticketLimit: 50.5,
  ticketAutoReset: false,
  statusControlEnabled: true,
  ...over,
});

describe('makeReadConfig', () => {
  it('returns the stored config', async () => {
    const result = await makeReadConfig(new FakeConfigRepository())();
    expect(isRight(result) && result.right.statusControlEnabled).toBe(true);
  });
});

describe('makeSaveConfig', () => {
  it('normalizes business info and ticket limit before saving', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSaveConfig(repo)(input());
    expect(isRight(result)).toBe(true);
    expect(repo.saved).toEqual({
      name: 'Bar',
      document: '12',
      phone: '99',
      address: 'Rua',
      ticketLimit: 50,
      ticketAutoReset: false,
      statusControlEnabled: true,
    });
  });
});

describe('makeResetTicketSequence', () => {
  it('normalizes the counter and saves only that field', async () => {
    const repo = new FakeConfigRepository();
    await makeResetTicketSequence(repo)(7.9);
    expect(repo.saved).toEqual({ ticketCounter: 7 });
  });
});
