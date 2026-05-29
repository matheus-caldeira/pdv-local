import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { Customer } from './customer.entity';

export interface FindOrCreateCustomerInput {
  phone: string;
  name: string;
  address: string;
}

export interface NewCustomerData {
  name: string;
  phone: string;
  addresses: string[];
}

export interface CustomerRepository {
  list(): Promise<Either<InfrastructureError, Customer[]>>;
  findByPhone(
    phone: string,
  ): Promise<Either<InfrastructureError, Customer | undefined>>;
  create(data: NewCustomerData): Promise<Either<InfrastructureError, Customer>>;
  update(
    id: number,
    data: NewCustomerData,
  ): Promise<Either<InfrastructureError, Customer>>;
  remove(id: number): Promise<Either<InfrastructureError, void>>;
  findOrCreate(
    input: FindOrCreateCustomerInput,
  ): Promise<Either<InfrastructureError, number | undefined>>;
}
