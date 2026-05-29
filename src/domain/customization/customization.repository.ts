import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type {
  CustomizationGroup,
  CustomizationItem,
  NewCustomizationGroup,
  NewCustomizationItem,
} from './customization.entity';

export interface CustomizationRepository {
  listGroups(): Promise<Either<InfrastructureError, CustomizationGroup[]>>;
  listItems(): Promise<Either<InfrastructureError, CustomizationItem[]>>;
  createGroup(
    group: NewCustomizationGroup,
  ): Promise<Either<InfrastructureError, CustomizationGroup>>;
  updateGroup(
    id: number,
    group: NewCustomizationGroup,
  ): Promise<Either<InfrastructureError, CustomizationGroup>>;
  removeGroup(id: number): Promise<Either<InfrastructureError, void>>;
  createItem(
    item: NewCustomizationItem,
  ): Promise<Either<InfrastructureError, CustomizationItem>>;
  updateItem(
    id: number,
    item: NewCustomizationItem,
  ): Promise<Either<InfrastructureError, CustomizationItem>>;
  removeItem(id: number): Promise<Either<InfrastructureError, void>>;
}
