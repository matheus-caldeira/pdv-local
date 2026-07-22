import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { MonthKey } from './finance.entity';
import type { CardInvoice, NewCardInvoice } from './payment-method.entity';

export interface CardInvoiceRepository {
  findByCardAndMonth(
    paymentMethodUid: string,
    month: MonthKey,
  ): Promise<Either<InfrastructureError, CardInvoice | undefined>>;
  listByCard(
    paymentMethodUid: string,
  ): Promise<Either<InfrastructureError, CardInvoice[]>>;
  listByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, CardInvoice[]>>;
  create(
    invoice: NewCardInvoice,
  ): Promise<Either<InfrastructureError, CardInvoice>>;
  update(
    uid: string,
    changes: Partial<Omit<CardInvoice, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, CardInvoice>>;
}
