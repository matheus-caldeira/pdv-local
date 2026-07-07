import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { InvalidCustomerError } from '../../domain/errors';
import {
  RegisterOrderUseCase,
  type RegisterOrderInput,
} from './register-order.usecase';

export class ScoutRegisterOrderUseCase extends RegisterOrderUseCase {
  protected async pre(
    input: RegisterOrderInput,
  ): Promise<Either<AppError, void>> {
    const base = await super.pre(input);
    if (isLeft(base)) return base;
    const section = input.extra?.section;
    const guardian = input.extra?.guardian;
    if (!section || !guardian) {
      return left(
        new InvalidCustomerError('Informe a seção e o responsável do aluno.'),
      );
    }
    return right(undefined);
  }
}
