import { left, right, type Either } from '../../../domain/shared/either';
import type { ConfigRepository } from '../../../domain/config/config.repository';
import type { BusinessConfig } from '../../../domain/config/config.entity';
import {
  formatTicket,
  nextTicketCounter,
} from '../../../domain/config/config.rules';
import type { InfrastructureError } from '../../errors';
import {
  CONFIG_ID,
  ORDER_DEFAULTS,
  TICKET_DEFAULTS,
  type PDVDatabase,
} from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

function withDefaults(stored?: BusinessConfig): BusinessConfig {
  return {
    id: CONFIG_ID,
    name: '',
    document: '',
    phone: '',
    address: '',
    ...TICKET_DEFAULTS,
    ...ORDER_DEFAULTS,
    ...stored,
  };
}

export class DexieConfigRepository implements ConfigRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async read(): Promise<Either<InfrastructureError, BusinessConfig>> {
    try {
      const stored = await this.db.config.get(CONFIG_ID);
      return right(withDefaults(stored));
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async claimTicket(): Promise<Either<InfrastructureError, string>> {
    try {
      const ticket = await this.db.transaction(
        'rw',
        this.db.config,
        async () => {
          const stored = await this.db.config.get(CONFIG_ID);
          const current = withDefaults(stored);
          await this.db.config.put({
            ...current,
            ticketCounter: nextTicketCounter(
              current.ticketCounter,
              current.ticketLimit,
              current.ticketAutoReset,
            ),
            id: CONFIG_ID,
          });
          return formatTicket(current.ticketCounter, current.ticketLimit);
        },
      );
      return right(ticket);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
