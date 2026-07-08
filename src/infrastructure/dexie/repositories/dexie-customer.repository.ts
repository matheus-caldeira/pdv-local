import { left, right, type Either } from '../../../domain/shared/either';
import type {
  CustomerRepository,
  FindOrCreateCustomerInput,
  NewCustomerData,
} from '../../../domain/customer/customer.repository';
import type { Customer } from '../../../domain/customer/customer.entity';
import { createUid } from '../../../domain/shared/uid';
import { RecordNotFoundError, type InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

const DEFAULT_NAME = 'Consumidor';

export class DexieCustomerRepository implements CustomerRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(): Promise<Either<InfrastructureError, Customer[]>> {
    try {
      const customers = await this.db.customers.toArray();
      customers.sort((a, b) => a.name.localeCompare(b.name));
      return right(customers);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async findByPhone(
    phone: string,
  ): Promise<Either<InfrastructureError, Customer | undefined>> {
    try {
      const customer = await this.db.customers
        .where('phone')
        .equals(phone)
        .first();
      return right(customer);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    data: NewCustomerData,
  ): Promise<Either<InfrastructureError, Customer>> {
    try {
      const now = Date.now();
      const uid = createUid();
      const customer = {
        ...data,
        uid,
        extra: data.extra ?? {},
        createdAt: now,
        updatedAt: now,
      };
      const id = await this.db.customers.add(customer);
      return right({ ...customer, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    uid: string,
    data: NewCustomerData,
  ): Promise<Either<InfrastructureError, Customer>> {
    try {
      const existing = await this.db.customers
        .filter((customer) => customer.uid === uid)
        .first();
      if (!existing?.id) {
        return left(new RecordNotFoundError('Cliente não encontrado.'));
      }
      const patch = {
        ...data,
        extra: data.extra ?? {},
        updatedAt: Date.now(),
      };
      await this.db.customers.update(existing.id, patch);
      return right({
        createdAt: existing.createdAt,
        ...patch,
        uid,
        id: existing.id,
      });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async remove(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.customers
        .filter((customer) => customer.uid === uid)
        .delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async findOrCreate(
    input: FindOrCreateCustomerInput,
  ): Promise<Either<InfrastructureError, string | undefined>> {
    try {
      const phone = input.phone?.trim();
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
        return right(existing.uid);
      }

      const uid = createUid();
      await this.db.customers.add({
        uid,
        name,
        phone,
        addresses: address ? [address] : [],
        extra: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return right(uid);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
