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

const SEARCH_LIMIT = 6;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function customerHaystack(customer: Customer): string {
  return normalize(
    [customer.name, customer.phone ?? '', ...Object.values(customer.extra)]
      .filter(Boolean)
      .join(' '),
  );
}

export function makeSearchCustomers(repository: CustomerRepository) {
  return async (value: string): Promise<Either<AppError, Customer[]>> => {
    const query = normalize(value.trim());
    if (!query) return right([]);

    const result = await repository.list();
    if (isLeft(result)) return result;

    const matches = result.right
      .filter((customer) => customerHaystack(customer).includes(query))
      .slice(0, SEARCH_LIMIT);
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
