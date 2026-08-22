import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { DuplicatePhoneError } from '../../domain/errors';
import type { Customer } from '../../domain/customer/customer.entity';
import type { CustomerRepository } from '../../domain/customer/customer.repository';
import {
  buildCustomer,
  type CustomerInput,
} from '../../domain/customer/customer.rules';
import type { BusinessTypeDefinition } from '../../domain/business-type/business-type.entity';

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
      .filter((customer) => (customer.phone ?? '').includes(query))
      .slice(0, PHONE_SEARCH_LIMIT);
    return right(matches);
  };
}

const NAME_SEARCH_LIMIT = 6;

export function makeSearchCustomersByName(repository: CustomerRepository) {
  return async (value: string): Promise<Either<AppError, Customer[]>> => {
    const query = value.trim().toLowerCase();
    if (!query) return right([]);
    const result = await repository.list();
    if (isLeft(result)) return result;
    const matches = result.right
      .filter((customer) => customer.name.toLowerCase().includes(query))
      .slice(0, NAME_SEARCH_LIMIT);
    return right(matches);
  };
}

export function makeSaveCustomer(repository: CustomerRepository) {
  return async (
    input: CustomerInput,
    definition: BusinessTypeDefinition,
    uid?: string,
  ): Promise<Either<AppError, Customer>> => {
    const built = buildCustomer(input, definition);
    if (isLeft(built)) return built;

    const data = built.right;

    if (data.phone) {
      const existing = await repository.findByPhone(data.phone);
      if (isLeft(existing)) return existing;
      if (existing.right && existing.right.uid !== uid) {
        return left(new DuplicatePhoneError());
      }
    }

    return uid === undefined
      ? repository.create(data)
      : repository.update(uid, data);
  };
}

export function makeRemoveCustomer(repository: CustomerRepository) {
  return (uid: string): Promise<Either<AppError, void>> =>
    repository.remove(uid);
}
