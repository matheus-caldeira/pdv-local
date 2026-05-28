import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../../domain/customization/customization.entity';
import type {
  CustomizationGroupInput,
  CustomizationItemInput,
} from '../../domain/customization/customization.rules';
import { useToast } from '../molecules/toast-context';

export function useCustomizations() {
  const toast = useToast();
  const [groups, setGroups] = useState<CustomizationGroup[]>([]);
  const [items, setItems] = useState<CustomizationItem[]>([]);

  const load = useCallback(async () => {
    const [groupsResult, itemsResult] = await Promise.all([
      container.listGroups(),
      container.listItems(),
    ]);
    fold(
      groupsResult,
      (error) => toast(error.message, 'error'),
      (list) => setGroups(list),
    );
    fold(
      itemsResult,
      (error) => toast(error.message, 'error'),
      (list) => setItems(list),
    );
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveGroup = useCallback(
    async (input: CustomizationGroupInput, id?: number) => {
      const result = id
        ? await container.updateGroup(id, input)
        : await container.createGroup(input);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(id ? 'Grupo atualizado' : 'Grupo criado');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const removeGroup = useCallback(
    async (id: number) => {
      const result = await container.removeGroup(id);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {
          toast('Grupo removido');
          load();
        },
      );
    },
    [toast, load],
  );

  const saveItem = useCallback(
    async (input: CustomizationItemInput, id?: number) => {
      const result = id
        ? await container.updateItem(id, input)
        : await container.createItem(input);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(id ? 'Item atualizado' : 'Item adicionado');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const removeItem = useCallback(
    async (id: number) => {
      const result = await container.removeItem(id);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {
          toast('Item removido');
          load();
        },
      );
    },
    [toast, load],
  );

  return { groups, items, saveGroup, removeGroup, saveItem, removeItem };
}
