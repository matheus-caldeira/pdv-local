import { left, right, type Either } from '../../../domain/shared/either';
import type {
  CustomizationGroup,
  CustomizationItem,
  NewCustomizationGroup,
  NewCustomizationItem,
} from '../../../domain/customization/customization.entity';
import type { CustomizationRepository } from '../../../domain/customization/customization.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieCustomizationRepository implements CustomizationRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async listGroups(): Promise<
    Either<InfrastructureError, CustomizationGroup[]>
  > {
    try {
      return right(await this.db.customizationGroups.toArray());
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listItems(): Promise<Either<InfrastructureError, CustomizationItem[]>> {
    try {
      return right(await this.db.customizationItems.toArray());
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async createGroup(
    group: NewCustomizationGroup,
  ): Promise<Either<InfrastructureError, CustomizationGroup>> {
    try {
      const id = await this.db.customizationGroups.add(
        group as CustomizationGroup,
      );
      return right({ ...group, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async updateGroup(
    id: number,
    group: NewCustomizationGroup,
  ): Promise<Either<InfrastructureError, CustomizationGroup>> {
    try {
      await this.db.customizationGroups.update(id, group);
      return right({ ...group, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async removeGroup(id: number): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.customizationItems.where('groupId').equals(id).delete();
      await this.db.customizationGroups.delete(id);
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async createItem(
    item: NewCustomizationItem,
  ): Promise<Either<InfrastructureError, CustomizationItem>> {
    try {
      const id = await this.db.customizationItems.add(
        item as CustomizationItem,
      );
      return right({ ...item, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async updateItem(
    id: number,
    item: NewCustomizationItem,
  ): Promise<Either<InfrastructureError, CustomizationItem>> {
    try {
      await this.db.customizationItems.update(id, item);
      return right({ ...item, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async removeItem(id: number): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.customizationItems.delete(id);
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
