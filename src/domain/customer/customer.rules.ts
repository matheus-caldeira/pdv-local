import { left, right, type Either } from '../shared/either';
import { InvalidCustomerError } from '../errors';

export interface CustomerInput {
  name: string;
  phone: string;
  addresses: string[];
}

export interface NormalizedCustomer {
  name: string;
  phone: string;
  addresses: string[];
}

const DEFAULT_NAME = 'Consumidor';

export function buildCustomer(
  input: CustomerInput,
): Either<InvalidCustomerError, NormalizedCustomer> {
  const phone = input.phone.trim();
  if (!phone) {
    return left(new InvalidCustomerError('Informe o telefone.'));
  }
  const name = input.name.trim() || DEFAULT_NAME;
  const addresses = input.addresses.map((a) => a.trim()).filter(Boolean);
  return right({ name, phone, addresses });
}
