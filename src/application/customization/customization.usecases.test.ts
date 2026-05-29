import { describe, expect, it, vi } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../../domain/customization/customization.entity';
import type { CustomizationRepository } from '../../domain/customization/customization.repository';
import { ConnectorError } from '../../infrastructure/errors';
import {
  makeCreateGroup,
  makeCreateItem,
  makeListGroups,
  makeListItems,
  makeRemoveGroup,
  makeRemoveItem,
  makeUpdateGroup,
  makeUpdateItem,
} from './customization.usecases';

function fakeRepo(): CustomizationRepository {
  return {
    listGroups: vi.fn(async () => right([] as CustomizationGroup[])),
    listItems: vi.fn(async () => right([] as CustomizationItem[])),
    createGroup: vi.fn(async (g) =>
      right({ ...g, id: 1 } as CustomizationGroup),
    ),
    updateGroup: vi.fn(async (id, g) =>
      right({ ...g, id } as CustomizationGroup),
    ),
    removeGroup: vi.fn(async () => right(undefined)),
    createItem: vi.fn(async (i) => right({ ...i, id: 1 } as CustomizationItem)),
    updateItem: vi.fn(async (id, i) =>
      right({ ...i, id } as CustomizationItem),
    ),
    removeItem: vi.fn(async () => right(undefined)),
  };
}

const groupInput = {
  name: 'Ponto',
  required: true,
  minQty: 1,
  maxQty: 1,
  chargeAfter: 0,
};
const itemInput = {
  groupId: 1,
  name: 'Extra',
  price: 0,
  maxQty: 1,
  chargeAfter: 0,
  active: true,
};

describe('customization use cases', () => {
  it('lists groups and items', async () => {
    const repo = fakeRepo();
    await makeListGroups(repo)();
    await makeListItems(repo)();
    expect(repo.listGroups).toHaveBeenCalled();
    expect(repo.listItems).toHaveBeenCalled();
  });

  it('creates a valid group', async () => {
    const repo = fakeRepo();
    const result = await makeCreateGroup(repo)(groupInput);
    expect(isRight(result)).toBe(true);
  });

  it('rejects an invalid group', async () => {
    const repo = fakeRepo();
    const result = await makeCreateGroup(repo)({ ...groupInput, name: '' });
    expect(isLeft(result)).toBe(true);
    expect(repo.createGroup).not.toHaveBeenCalled();
  });

  it('updates a valid group', async () => {
    const repo = fakeRepo();
    const result = await makeUpdateGroup(repo)(2, groupInput);
    expect(isRight(result) && result.right.id).toBe(2);
  });

  it('rejects an invalid group update', async () => {
    const repo = fakeRepo();
    const result = await makeUpdateGroup(repo)(2, { ...groupInput, name: '' });
    expect(isLeft(result)).toBe(true);
  });

  it('creates a valid item', async () => {
    const repo = fakeRepo();
    const result = await makeCreateItem(repo)(itemInput);
    expect(isRight(result)).toBe(true);
  });

  it('rejects an invalid item', async () => {
    const repo = fakeRepo();
    const result = await makeCreateItem(repo)({ ...itemInput, name: '' });
    expect(isLeft(result)).toBe(true);
    expect(repo.createItem).not.toHaveBeenCalled();
  });

  it('updates a valid item', async () => {
    const repo = fakeRepo();
    const result = await makeUpdateItem(repo)(3, itemInput);
    expect(isRight(result) && result.right.id).toBe(3);
  });

  it('rejects an invalid item update', async () => {
    const repo = fakeRepo();
    const result = await makeUpdateItem(repo)(3, { ...itemInput, name: '' });
    expect(isLeft(result)).toBe(true);
  });

  it('removes an item', async () => {
    const repo = fakeRepo();
    await makeRemoveItem(repo)(4);
    expect(repo.removeItem).toHaveBeenCalledWith(4);
  });
});

describe('makeRemoveGroup', () => {
  function fakeUow(repositories: Partial<Repositories>): UnitOfWork {
    return {
      run: async <A>(work: (r: Repositories) => Promise<Either<AppError, A>>) =>
        work(repositories as Repositories),
    };
  }

  it('removes product refs and the group atomically', async () => {
    const removeCustomizationGroup = vi.fn(async () => right(undefined));
    const removeGroup = vi.fn(async () => right(undefined));
    const uow = fakeUow({
      products: { removeCustomizationGroup } as never,
      customizations: { removeGroup } as never,
    });
    const result = await makeRemoveGroup(uow)(5);
    expect(isRight(result)).toBe(true);
    expect(removeCustomizationGroup).toHaveBeenCalledWith(5);
    expect(removeGroup).toHaveBeenCalledWith(5);
  });

  it('aborts when removing product refs fails', async () => {
    const removeGroup = vi.fn(async () => right(undefined));
    const uow = fakeUow({
      products: {
        removeCustomizationGroup: async () => left(new ConnectorError('x')),
      } as never,
      customizations: { removeGroup } as never,
    });
    const result = await makeRemoveGroup(uow)(5);
    expect(isLeft(result)).toBe(true);
    expect(removeGroup).not.toHaveBeenCalled();
  });

  it('aborts when removing the group fails', async () => {
    const uow = fakeUow({
      products: {
        removeCustomizationGroup: async () => right(undefined),
      } as never,
      customizations: {
        removeGroup: async () => left(new ConnectorError('x')),
      } as never,
    });
    const result = await makeRemoveGroup(uow)(5);
    expect(isLeft(result)).toBe(true);
  });
});
