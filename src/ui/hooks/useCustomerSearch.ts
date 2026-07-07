import { useCallback, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Customer } from '../../domain/customer/customer.entity';

export function useCustomerSearch() {
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  const search = useCallback(async (value: string) => {
    const result = await container.searchCustomersByPhone(value);
    fold(
      result,
      () => setSuggestions([]),
      (matches) => setSuggestions(matches),
    );
  }, []);

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, search, clear };
}
