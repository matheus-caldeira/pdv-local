import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { CashMovement, NewCashMovement, Session } from './cash.entity';

export interface CashRepository {
  findOpenSession(): Promise<Either<InfrastructureError, Session | undefined>>;
  listSessions(): Promise<Either<InfrastructureError, Session[]>>;
  openSession(
    cashInitial: number,
  ): Promise<Either<InfrastructureError, Session>>;
  closeSession(
    uid: string,
    cashFinal: number,
    notes: string,
  ): Promise<Either<InfrastructureError, Session>>;
  listMovements(
    sessionUid: string,
  ): Promise<Either<InfrastructureError, CashMovement[]>>;
  addMovement(
    movement: NewCashMovement,
  ): Promise<Either<InfrastructureError, CashMovement>>;
}
