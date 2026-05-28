import { left, right, type Either } from '../../../domain/shared/either';
import type {
  CustomerRepository,
  FindOrCreateCustomerInput,
} from '../../../domain/customer/customer.repository';
import type { Customer } from '../../../domain/customer/customer.entity';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

const DEFAULT_NAME = 'Consumidor';

export class DexieCustomerRepository implements CustomerRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async findOrCreate(
    input: FindOrCreateCustomerInput,
  ): Promise<Either<InfrastructureError, number | undefined>> {
    try {
      const phone = input.phone.trim();
      if (!phone) return right(undefined);

      const name = input.name.trim() || DEFAULT_NAME;
      const address = input.address.trim();

      const existing = await this.db.customers
        .where('phone')
        .equals(phone)
        .first();

      if (existing?.id) {
        const patch: Partial<Customer> = { updatedAt: Date.now() };
        if (address && !existing.addresses.includes(address)) {
          patch.addresses = [...existing.addresses, address];
        }
        if (existing.name === DEFAULT_NAME && name !== DEFAULT_NAME) {
          patch.name = name;
        }
        await this.db.customers.update(existing.id, patch);
        return right(existing.id);
      }

      const id = await this.db.customers.add({
        name,
        phone,
        addresses: address ? [address] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return right(id);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
