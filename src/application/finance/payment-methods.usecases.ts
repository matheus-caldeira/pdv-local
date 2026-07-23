import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { createUid } from '../../domain/shared/uid';
import {
  InvalidCardDayError,
  PaymentMethodNotFoundError,
} from '../../domain/errors';
import type {
  PaymentMethod,
  PaymentMethodType,
} from '../../domain/finance/payment-method.entity';
import type { PaymentMethodRepository } from '../../domain/finance/payment-method.repository';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';

export interface PaymentMethodInput {
  name: string;
  type: PaymentMethodType;
  closingDay: number | null;
  dueDay: number | null;
}

interface NormalizedDays {
  closingDay: number | null;
  dueDay: number | null;
}

const isValidDay = (day: number): boolean =>
  Number.isInteger(day) && day >= 1 && day <= 31;

function normalizeDays(
  input: PaymentMethodInput,
): Either<InvalidCardDayError, NormalizedDays> {
  if (input.type !== 'credit') {
    return right({ closingDay: null, dueDay: null });
  }
  if (input.closingDay === null || input.dueDay === null) {
    return left(new InvalidCardDayError());
  }
  if (!isValidDay(input.closingDay) || !isValidDay(input.dueDay)) {
    return left(new InvalidCardDayError());
  }
  return right({ closingDay: input.closingDay, dueDay: input.dueDay });
}

export function makeListPaymentMethods(methods: PaymentMethodRepository) {
  return async (): Promise<Either<AppError, PaymentMethod[]>> => methods.list();
}

export function makeCreatePaymentMethod(methods: PaymentMethodRepository) {
  return async (
    input: PaymentMethodInput,
  ): Promise<Either<AppError, PaymentMethod>> => {
    const days = normalizeDays(input);
    if (isLeft(days)) return days;
    return methods.create({
      uid: createUid(),
      name: input.name.trim(),
      type: input.type,
      closingDay: days.right.closingDay,
      dueDay: days.right.dueDay,
      archived: false,
      createdAt: Date.now(),
    });
  };
}

export function makeUpdatePaymentMethod(methods: PaymentMethodRepository) {
  return async (
    uid: string,
    input: PaymentMethodInput,
  ): Promise<Either<AppError, PaymentMethod>> => {
    const existing = await methods.findByUid(uid);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new PaymentMethodNotFoundError());

    const days = normalizeDays(input);
    if (isLeft(days)) return days;

    return methods.update(uid, {
      name: input.name.trim(),
      type: input.type,
      closingDay: days.right.closingDay,
      dueDay: days.right.dueDay,
    });
  };
}

export function makeArchivePaymentMethod(
  methods: PaymentMethodRepository,
  entries: FinanceEntryRepository,
) {
  return async (uid: string): Promise<Either<AppError, void>> => {
    const existing = await methods.findByUid(uid);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new PaymentMethodNotFoundError());

    const used = await entries.list({ paymentMethodUid: uid });
    if (isLeft(used)) return used;

    if (used.right.length === 0) {
      return methods.delete(uid);
    }

    const archived = await methods.update(uid, { archived: true });
    if (isLeft(archived)) return archived;
    return right(undefined);
  };
}
