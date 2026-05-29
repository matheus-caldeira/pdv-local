import { left, right, type Either } from '../shared/either';
import { InvalidCashAmountError, InvalidCashMovementError } from '../errors';
import type { CashMovement, CashMovementType } from './cash.entity';

export interface CashMovementInput {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export interface NormalizedCashMovement {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export function normalizeCashInitial(
  amount: number,
): Either<InvalidCashAmountError, number> {
  if (!Number.isFinite(amount) || amount < 0) {
    return left(new InvalidCashAmountError());
  }
  return right(amount);
}

export function buildCashMovement(
  input: CashMovementInput,
): Either<InvalidCashMovementError, NormalizedCashMovement> {
  if (input.type !== 'sangria' && input.type !== 'suprimento') {
    return left(new InvalidCashMovementError('Tipo de movimentação inválido.'));
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return left(
      new InvalidCashMovementError('Informe um valor maior que zero.'),
    );
  }
  return right({
    type: input.type,
    amount: input.amount,
    reason: input.reason.trim(),
  });
}

export interface ExpectedCashInput {
  cashInitial: number;
  cashSales: number;
  movements: CashMovement[];
}

export function calculateExpectedCash(input: ExpectedCashInput): number {
  const supplies = input.movements
    .filter((movement) => movement.type === 'suprimento')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const withdrawals = input.movements
    .filter((movement) => movement.type === 'sangria')
    .reduce((sum, movement) => sum + movement.amount, 0);
  return input.cashInitial + input.cashSales + supplies - withdrawals;
}
