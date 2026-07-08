import { useCallback } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import { useToast } from '../molecules/toast-context';
import { useActiveBusinessType } from './useActiveBusinessType';
import type { RegisterOrderInput } from '../../application/order/register-order.usecase';

export function useRegisterOrder() {
  const toast = useToast();
  const { definition } = useActiveBusinessType();

  const register = useCallback(
    async (input: RegisterOrderInput): Promise<boolean> => {
      if (!definition) {
        toast('Tipo de negócio não definido.', 'error');
        return false;
      }
      const result = await container.registerOrder(
        definition.id,
        definition,
        input,
      );
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Pedido registrado');
          return true;
        },
      );
    },
    [definition, toast],
  );

  return { register, ordering: definition?.rules.ordering ?? 'optional' };
}
