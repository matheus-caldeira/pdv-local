import { left, right, type Either } from '../../../domain/shared/either';
import type {
  NewPaymentMethod,
  PaymentMethod,
} from '../../../domain/finance/payment-method.entity';
import type { PaymentMethodRepository } from '../../../domain/finance/payment-method.repository';
import { RecordNotFoundError, type InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexiePaymentMethodRepository implements PaymentMethodRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(): Promise<Either<InfrastructureError, PaymentMethod[]>> {
    try {
      const methods = await this.db.financePaymentMethods.toArray();
      methods.sort((a, b) => a.name.localeCompare(b.name));
      return right(methods);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async findByUid(
    uid: string,
  ): Promise<Either<InfrastructureError, PaymentMethod | undefined>> {
    try {
      const method = await this.db.financePaymentMethods
        .where('uid')
        .equals(uid)
        .first();
      return right(method);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    method: NewPaymentMethod,
  ): Promise<Either<InfrastructureError, PaymentMethod>> {
    try {
      const record = { ...method };
      const id = await this.db.financePaymentMethods.add(record);
      return right({ ...record, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    uid: string,
    changes: Partial<Omit<PaymentMethod, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, PaymentMethod>> {
    try {
      const existing = await this.db.financePaymentMethods
        .where('uid')
        .equals(uid)
        .first();
      if (!existing?.id) {
        return left(
          new RecordNotFoundError('Meio de pagamento não encontrado.'),
        );
      }
      await this.db.financePaymentMethods.update(existing.id, changes);
      return right({ ...existing, ...changes });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financePaymentMethods.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
