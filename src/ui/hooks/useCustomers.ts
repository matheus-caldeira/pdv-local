import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Customer } from '../../domain/customer/customer.entity';
import type { CustomerInput } from '../../domain/customer/customer.rules';
import { useToast } from '../molecules/toast-context';

export function useCustomers() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);

  const loadCustomers = useCallback(async () => {
    const result = await container.listCustomers();
    fold(
      result,
      (error) => toast(error.message, 'error'),
      (list) =>
        setCustomers([...list].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const saveCustomer = useCallback(
    async (input: CustomerInput, id?: number) => {
      const result = await container.saveCustomer(input, id);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Cliente salvo');
          loadCustomers();
          return true;
        },
      );
    },
    [toast, loadCustomers],
  );

  const removeCustomer = useCallback(
    async (id: number) => {
      const result = await container.removeCustomer(id);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Cliente excluido');
          loadCustomers();
          return true;
        },
      );
    },
    [toast, loadCustomers],
  );

  return { customers, saveCustomer, removeCustomer };
}
