import { left, right, type Either } from '../../../domain/shared/either';
import type {
  CashMovement,
  NewCashMovement,
  Session,
} from '../../../domain/cash/cash.entity';
import type { CashRepository } from '../../../domain/cash/cash.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieCashRepository implements CashRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async findOpenSession(): Promise<
    Either<InfrastructureError, Session | undefined>
  > {
    try {
      const sessions = await this.db.sessions.toArray();
      return right(sessions.find((session) => session.closedAt === null));
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listSessions(): Promise<Either<InfrastructureError, Session[]>> {
    try {
      const sessions = await this.db.sessions.toArray();
      sessions.sort((a, b) => b.openedAt - a.openedAt);
      return right(sessions);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async openSession(
    cashInitial: number,
  ): Promise<Either<InfrastructureError, Session>> {
    try {
      const session = {
        openedAt: Date.now(),
        closedAt: null,
        cashInitial,
        cashFinal: null,
        notes: '',
      };
      const id = await this.db.sessions.add(session);
      return right({ ...session, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async closeSession(
    id: number,
    cashFinal: number,
    notes: string,
  ): Promise<Either<InfrastructureError, Session>> {
    try {
      const patch = { closedAt: Date.now(), cashFinal, notes };
      await this.db.sessions.update(id, patch);
      const stored = await this.db.sessions.get(id);
      return right({
        openedAt: stored?.openedAt ?? Date.now(),
        cashInitial: stored?.cashInitial ?? 0,
        ...patch,
        id,
      });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listMovements(
    sessionId: number,
  ): Promise<Either<InfrastructureError, CashMovement[]>> {
    try {
      const movements = await this.db.cashMovements
        .where('sessionId')
        .equals(sessionId)
        .toArray();
      movements.sort((a, b) => b.createdAt - a.createdAt);
      return right(movements);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async addMovement(
    movement: NewCashMovement,
  ): Promise<Either<InfrastructureError, CashMovement>> {
    try {
      const id = await this.db.cashMovements.add(movement);
      return right({ ...movement, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
