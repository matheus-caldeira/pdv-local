import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { DuplicatePhoneError } from '../../domain/errors';
import type { Customer } from '../../domain/customer/customer.entity';
import type { CustomerRepository } from '../../domain/customer/customer.repository';
import {
  buildCustomer,
  type CustomerInput,
} from '../../domain/customer/customer.rules';

export function makeListCustomers(repository: CustomerRepository) {
  return (): Promise<Either<AppError, Customer[]>> => repository.list();
}

const PHONE_SEARCH_MIN = 3;
const PHONE_SEARCH_LIMIT = 6;

export function makeSearchCustomersByPhone(repository: CustomerRepository) {
  return async (value: string): Promise<Either<AppError, Customer[]>> => {
    const query = value.trim();
    if (query.length < PHONE_SEARCH_MIN) return right([]);
    const result = await repository.list();
    if (isLeft(result)) return result;
    const matches = result.right
      .filter((customer) => customer.phone.includes(query))
      .slice(0, PHONE_SEARCH_LIMIT);
    return right(matches);
  };
}

export function makeSaveCustomer(repository: CustomerRepository) {
  return async (
    input: CustomerInput,
    id?: number,
  ): Promise<Either<AppError, Customer>> => {
    const built = buildCustomer(input);
    if (isLeft(built)) return built;

    const existing = await repository.findByPhone(built.right.phone);
    if (isLeft(existing)) return existing;
    if (existing.right && existing.right.id !== id) {
      return left(new DuplicatePhoneError());
    }

    return id === undefined
      ? repository.create(built.right)
      : repository.update(id, built.right);
  };
}

export function makeRemoveCustomer(repository: CustomerRepository) {
  return (id: number): Promise<Either<AppError, void>> => repository.remove(id);
}
