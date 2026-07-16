import { left, right, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type { FamilyMember } from '../../../domain/finance/finance.entity';
import type { FinanceMemberRepository } from '../../../domain/finance/finance-member.repository';
import { RecordNotFoundError, type InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieFinanceMemberRepository implements FinanceMemberRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(): Promise<Either<InfrastructureError, FamilyMember[]>> {
    try {
      const members = await this.db.financeMembers.toArray();
      members.sort((a, b) => a.name.localeCompare(b.name));
      return right(members);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    name: string,
  ): Promise<Either<InfrastructureError, FamilyMember>> {
    try {
      const member = {
        uid: createUid(),
        name,
        archived: false,
        createdAt: Date.now(),
      };
      const id = await this.db.financeMembers.add(member);
      return right({ ...member, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    uid: string,
    changes: Partial<Pick<FamilyMember, 'name' | 'archived'>>,
  ): Promise<Either<InfrastructureError, FamilyMember>> {
    try {
      const existing = await this.db.financeMembers
        .where('uid')
        .equals(uid)
        .first();
      if (!existing?.id) {
        return left(new RecordNotFoundError('Membro não encontrado.'));
      }
      await this.db.financeMembers.update(existing.id, changes);
      return right({ ...existing, ...changes });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async delete(uid: string): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.financeMembers.where('uid').equals(uid).delete();
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async ensureDefault(
    name: string,
  ): Promise<Either<InfrastructureError, FamilyMember | null>> {
    try {
      const created = await this.db.transaction(
        'rw',
        this.db.financeMembers,
        async () => {
          const count = await this.db.financeMembers.count();
          if (count > 0) return null;
          const member = {
            uid: createUid(),
            name,
            archived: false,
            createdAt: Date.now(),
          };
          const id = await this.db.financeMembers.add(member);
          return { ...member, id };
        },
      );
      return right(created);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
