import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { FamilyMember } from './finance.entity';

export interface FinanceMemberRepository {
  list(): Promise<Either<InfrastructureError, FamilyMember[]>>;
  create(name: string): Promise<Either<InfrastructureError, FamilyMember>>;
  update(
    uid: string,
    changes: Partial<Pick<FamilyMember, 'name' | 'archived'>>,
  ): Promise<Either<InfrastructureError, FamilyMember>>;
  delete(uid: string): Promise<Either<InfrastructureError, void>>;
  ensureDefault(
    name: string,
  ): Promise<Either<InfrastructureError, FamilyMember | null>>;
}
