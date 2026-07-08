import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';

export function useActiveBusinessType() {
  const [definition, setDefinition] = useState<BusinessTypeDefinition | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    container.resolveActiveType().then((result) => {
      if (!active) return;
      fold(
        result,
        (e) => setError(e.message),
        (def) => setDefinition(def),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { definition, loading, error };
}
