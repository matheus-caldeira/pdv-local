import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { NewPaymentMethod, PaymentMethod } from './payment-method.entity';

export interface PaymentMethodRepository {
  list(): Promise<Either<InfrastructureError, PaymentMethod[]>>;
  findByUid(
    uid: string,
  ): Promise<Either<InfrastructureError, PaymentMethod | undefined>>;
  create(
    method: NewPaymentMethod,
  ): Promise<Either<InfrastructureError, PaymentMethod>>;
  update(
    uid: string,
    changes: Partial<Omit<PaymentMethod, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, PaymentMethod>>;
  delete(uid: string): Promise<Either<InfrastructureError, void>>;
}
