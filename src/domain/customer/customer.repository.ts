import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';

export interface FindOrCreateCustomerInput {
  phone: string;
  name: string;
  address: string;
}

export interface CustomerRepository {
  findOrCreate(
    input: FindOrCreateCustomerInput,
  ): Promise<Either<InfrastructureError, number | undefined>>;
}
