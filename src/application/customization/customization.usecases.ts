import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../../domain/customization/customization.entity';
import type { CustomizationRepository } from '../../domain/customization/customization.repository';
import {
  buildCustomizationGroup,
  buildCustomizationItem,
  type CustomizationGroupInput,
  type CustomizationItemInput,
} from '../../domain/customization/customization.rules';

export function makeListGroups(repository: CustomizationRepository) {
  return (): Promise<Either<AppError, CustomizationGroup[]>> =>
    repository.listGroups();
}

export function makeListItems(repository: CustomizationRepository) {
  return (): Promise<Either<AppError, CustomizationItem[]>> =>
    repository.listItems();
}

export function makeCreateGroup(repository: CustomizationRepository) {
  return async (
    input: CustomizationGroupInput,
  ): Promise<Either<AppError, CustomizationGroup>> => {
    const built = buildCustomizationGroup(input);
    if (isLeft(built)) return built;
    return repository.createGroup(built.right);
  };
}

export function makeUpdateGroup(repository: CustomizationRepository) {
  return async (
    id: number,
    input: CustomizationGroupInput,
  ): Promise<Either<AppError, CustomizationGroup>> => {
    const built = buildCustomizationGroup(input);
    if (isLeft(built)) return built;
    return repository.updateGroup(id, built.right);
  };
}

export function makeRemoveGroup(uow: UnitOfWork) {
  return (id: number): Promise<Either<AppError, void>> =>
    uow.run(async (repositories) => {
      const productsResult =
        await repositories.products.removeCustomizationGroup(id);
      if (isLeft(productsResult)) return productsResult;
      const groupResult = await repositories.customizations.removeGroup(id);
      if (isLeft(groupResult)) return groupResult;
      return right(undefined);
    });
}

export function makeCreateItem(repository: CustomizationRepository) {
  return async (
    input: CustomizationItemInput,
  ): Promise<Either<AppError, CustomizationItem>> => {
    const built = buildCustomizationItem(input);
    if (isLeft(built)) return built;
    return repository.createItem(built.right);
  };
}

export function makeUpdateItem(repository: CustomizationRepository) {
  return async (
    id: number,
    input: CustomizationItemInput,
  ): Promise<Either<AppError, CustomizationItem>> => {
    const built = buildCustomizationItem(input);
    if (isLeft(built)) return built;
    return repository.updateItem(id, built.right);
  };
}

export function makeRemoveItem(repository: CustomizationRepository) {
  return (id: number): Promise<Either<AppError, void>> =>
    repository.removeItem(id);
}
