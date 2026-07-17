import { describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';
import type { Order } from '../../domain/order/order.entity';
import type { Session } from '../../domain/cash/cash.entity';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import {
  makeCompleteFirstRun,
  makeResolveModulesState,
  makeSaveEnabledModules,
} from './modules.usecases';

const baseConfig: BusinessConfig = {
  id: 1,
  name: '',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
  statusControlEnabled: false,
  businessTypeId: '',
  enabledModules: [],
  extra: {},
};

class FakeConfigRepo {
  saved: Partial<BusinessConfig> | null = null;
  private config: BusinessConfig;
  constructor(config: BusinessConfig = baseConfig) {
    this.config = config;
  }
  async read(): Promise<Either<InfrastructureError, BusinessConfig>> {
    return right(this.config);
  }
  async save(
    patch: Partial<BusinessConfig>,
  ): Promise<Either<InfrastructureError, BusinessConfig>> {
    this.saved = patch;
    this.config = { ...this.config, ...patch };
    return right(this.config);
  }
}

class FakeOrderRepo {
  private orders: Order[];
  constructor(orders: Order[] = []) {
    this.orders = orders;
  }
  async listAll(): Promise<Either<InfrastructureError, Order[]>> {
    return right(this.orders);
  }
}

class FakeCashRepo {
  private sessions: Session[];
  constructor(sessions: Session[] = []) {
    this.sessions = sessions;
  }
  async listSessions(): Promise<Either<InfrastructureError, Session[]>> {
    return right(this.sessions);
  }
}

const fakeOrder = { uid: 'o1' } as Order;
const fakeSession = { uid: 's1' } as Session;

function make(
  config: BusinessConfig = baseConfig,
  orders: Order[] = [],
  sessions: Session[] = [],
) {
  const configRepo = new FakeConfigRepo(config);
  const usecase = makeResolveModulesState({
    configRepo,
    orderRepo: new FakeOrderRepo(orders),
    cashRepo: new FakeCashRepo(sessions),
  });
  return { usecase, configRepo };
}

describe('makeResolveModulesState', () => {
  it('returns the stored selection without touching sales data', async () => {
    const { usecase, configRepo } = make({
      ...baseConfig,
      enabledModules: ['finance'],
    });
    const result = await usecase();
    expect(isRight(result) && result.right).toEqual({
      modules: ['finance'],
      needsFirstRun: false,
    });
    expect(configRepo.saved).toBeNull();
  });

  it('migrates silently to pdv when there are orders', async () => {
    const { usecase, configRepo } = make(baseConfig, [fakeOrder]);
    const result = await usecase();
    expect(isRight(result) && result.right).toEqual({
      modules: ['pdv'],
      needsFirstRun: false,
    });
    expect(configRepo.saved).toEqual({ enabledModules: ['pdv'] });
  });

  it('migrates silently to pdv when there are cash sessions', async () => {
    const { usecase, configRepo } = make(baseConfig, [], [fakeSession]);
    const result = await usecase();
    expect(isRight(result) && result.right.modules).toEqual(['pdv']);
    expect(configRepo.saved).toEqual({ enabledModules: ['pdv'] });
  });

  it('asks for first run on a fresh install', async () => {
    const { usecase, configRepo } = make();
    const result = await usecase();
    expect(isRight(result) && result.right).toEqual({
      modules: [],
      needsFirstRun: true,
    });
    expect(configRepo.saved).toBeNull();
  });

  it('propagates a config read failure', async () => {
    const failing: Pick<ConfigRepository, 'read' | 'save'> = {
      read: async () => left(new ConnectorError('falhou')),
      save: async () => right(baseConfig),
    };
    const usecase = makeResolveModulesState({
      configRepo: failing,
      orderRepo: new FakeOrderRepo(),
      cashRepo: new FakeCashRepo(),
    });
    expect(isLeft(await usecase())).toBe(true);
  });
});

describe('makeSaveEnabledModules', () => {
  it('persists a valid selection', async () => {
    const repo = new FakeConfigRepo();
    const result = await makeSaveEnabledModules(repo)(['pdv', 'finance']);
    expect(isRight(result) && result.right).toEqual(['pdv', 'finance']);
    expect(repo.saved).toEqual({ enabledModules: ['pdv', 'finance'] });
  });

  it('rejects an empty selection with modules/last-module-disabled', async () => {
    const repo = new FakeConfigRepo();
    const result = await makeSaveEnabledModules(repo)([]);
    expect(isLeft(result) && result.left.code).toBe(
      'modules/last-module-disabled',
    );
    expect(repo.saved).toBeNull();
  });

  it('rejects unknown ids with modules/unknown-module', async () => {
    const result = await makeSaveEnabledModules(new FakeConfigRepo())([
      'stock',
    ]);
    expect(isLeft(result) && result.left.code).toBe('modules/unknown-module');
  });
});

describe('makeCompleteFirstRun', () => {
  it('saves modules and business type together for pdv', async () => {
    const repo = new FakeConfigRepo();
    const result = await makeCompleteFirstRun(repo)({
      modules: ['pdv', 'finance'],
      businessTypeId: 'tab',
    });
    expect(isRight(result) && result.right).toEqual(['pdv', 'finance']);
    expect(repo.saved).toEqual({
      enabledModules: ['pdv', 'finance'],
      businessTypeId: 'tab',
    });
  });

  it('saves only modules when pdv is not selected', async () => {
    const repo = new FakeConfigRepo();
    const result = await makeCompleteFirstRun(repo)({ modules: ['finance'] });
    expect(isRight(result)).toBe(true);
    expect(repo.saved).toEqual({ enabledModules: ['finance'] });
  });

  it('requires a business type when pdv is selected', async () => {
    const result = await makeCompleteFirstRun(new FakeConfigRepo())({
      modules: ['pdv'],
    });
    expect(isLeft(result) && result.left.code).toBe(
      'BUSINESS_TYPE_NOT_SELECTED',
    );
  });

  it('rejects an unknown business type', async () => {
    const result = await makeCompleteFirstRun(new FakeConfigRepo())({
      modules: ['pdv'],
      businessTypeId: 'bakery',
    });
    expect(isLeft(result) && result.left.code).toBe('UNKNOWN_BUSINESS_TYPE');
  });

  it('rejects an invalid module selection', async () => {
    const result = await makeCompleteFirstRun(new FakeConfigRepo())({
      modules: [],
    });
    expect(isLeft(result) && result.left.code).toBe(
      'modules/last-module-disabled',
    );
  });
});
