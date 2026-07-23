import {
  isRight,
  left,
  right,
  type Either,
} from '../../../domain/shared/either';
import type { MonthKey } from '../../../domain/finance/finance.entity';
import type {
  CardInvoice,
  NewCardInvoice,
} from '../../../domain/finance/payment-method.entity';
import type { CardInvoiceRepository } from '../../../domain/finance/card-invoice.repository';
import {
  RecordNotFoundError,
  UniqueConstraintError,
  type InfrastructureError,
} from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieCardInvoiceRepository implements CardInvoiceRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async findByCardAndMonth(
    paymentMethodUid: string,
    month: MonthKey,
  ): Promise<Either<InfrastructureError, CardInvoice | undefined>> {
    try {
      const invoice = await this.db.financeCardInvoices
        .where('[paymentMethodUid+month]')
        .equals([paymentMethodUid, month])
        .first();
      return right(invoice);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listByCard(
    paymentMethodUid: string,
  ): Promise<Either<InfrastructureError, CardInvoice[]>> {
    try {
      const invoices = await this.db.financeCardInvoices
        .where('paymentMethodUid')
        .equals(paymentMethodUid)
        .toArray();
      invoices.sort((a, b) => a.month.localeCompare(b.month));
      return right(invoices);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listByMonth(
    month: MonthKey,
  ): Promise<Either<InfrastructureError, CardInvoice[]>> {
    try {
      const invoices = await this.db.financeCardInvoices
        .where('month')
        .equals(month)
        .toArray();
      return right(invoices);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    invoice: NewCardInvoice,
  ): Promise<Either<InfrastructureError, CardInvoice>> {
    try {
      const existing = await this.findByCardAndMonth(
        invoice.paymentMethodUid,
        invoice.month,
      );
      if (isRight(existing) && existing.right) {
        return left(
          new UniqueConstraintError('Fatura já existe para esse mês.'),
        );
      }
      const record = { ...invoice };
      const id = await this.db.financeCardInvoices.add(record);
      return right({ ...record, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    uid: string,
    changes: Partial<Omit<CardInvoice, 'id' | 'uid' | 'createdAt'>>,
  ): Promise<Either<InfrastructureError, CardInvoice>> {
    try {
      const existing = await this.db.financeCardInvoices
        .where('uid')
        .equals(uid)
        .first();
      if (!existing?.id) {
        return left(new RecordNotFoundError('Fatura não encontrada.'));
      }
      await this.db.financeCardInvoices.update(existing.id, changes);
      return right({ ...existing, ...changes });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
