import { describe, expect, it } from 'vitest';
import { isRight, right, type Either } from '../../domain/shared/either';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';
import type { InfrastructureError } from '../../infrastructure/errors';
import { makeReadConfig } from './config.usecases';

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
  async read(): Promise<Either<InfrastructureError, BusinessConfig>> {
    return right(config);
  }
  async claimTicket(): Promise<Either<InfrastructureError, string>> {
    return right('0001');
  }
}

describe('makeReadConfig', () => {
  it('returns the stored config', async () => {
    const result = await makeReadConfig(new FakeConfigRepository())();
    expect(isRight(result) && result.right.statusControlEnabled).toBe(true);
  });
});
