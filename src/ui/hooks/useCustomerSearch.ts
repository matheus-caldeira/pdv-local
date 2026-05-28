import { useCallback, useState } from 'react';
import { getDatabase } from '../../infrastructure/dexie/provider-registry';
import type { Customer } from '../../domain/customer/customer.entity';

export function useCustomerSearch() {
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  const search = useCallback(async (value: string) => {
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const all = await getDatabase().customers.toArray();
    setSuggestions(all.filter((c) => c.phone.includes(query)).slice(0, 6));
  }, []);

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, search, clear };
}
