import { left, right, type Either } from '../shared/either';
import { InvalidCustomerError } from '../errors';
import type { BusinessTypeDefinition } from '../business-type/business-type.entity';
import type { Customer } from './customer.entity';

export const SECTION_LABELS: Record<string, string> = {
  lobinho: 'Lobinho',
  escoteiro: 'Escoteiro',
  senior: 'Sênior',
  pioneiro: 'Pioneiro',
};

export interface CustomerInput {
  name: string;
  phone: string;
  addresses: string[];
  extra?: Record<string, string>;
}

export interface NormalizedCustomer {
  name: string;
  phone: string;
  addresses: string[];
  extra: Record<string, string>;
}

const SCOUT_TYPE_ID = 'scout';
const SCOUT_REQUIRED_FIELD = 'section';

function phoneIsRequired(definition: BusinessTypeDefinition): boolean {
  return definition.id !== SCOUT_TYPE_ID;
}

export function buildCustomer(
  input: CustomerInput,
  definition: BusinessTypeDefinition,
): Either<InvalidCustomerError, NormalizedCustomer> {
  const name = input.name.trim();
  if (!name) {
    return left(new InvalidCustomerError('Informe o nome.'));
  }

  const phone = input.phone.trim();
  if (!phone && phoneIsRequired(definition)) {
    return left(new InvalidCustomerError('Informe o telefone.'));
  }

  const extra = input.extra ?? {};
  if (
    definition.id === SCOUT_TYPE_ID &&
    !(extra[SCOUT_REQUIRED_FIELD] ?? '').trim()
  ) {
    return left(new InvalidCustomerError('Informe a seção.'));
  }

  const addresses = input.addresses.map((a) => a.trim()).filter(Boolean);
  return right({ name, phone, addresses, extra });
}

export function customerSuggestionLabel(customer: Customer): string {
  const section = (customer.extra.section ?? '').trim();
  const guardian = (customer.extra.guardian ?? '').trim();
  return [
    customer.name,
    section && (SECTION_LABELS[section] ?? section),
    guardian,
  ]
    .filter(Boolean)
    .join(' - ');
}
