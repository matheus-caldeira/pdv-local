import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import { useToast } from '../molecules/toast-context';

export function useStatusControl(dependencyKey: string) {
  const toast = useToast();
  const [statusControl, setStatusControl] = useState(false);

  useEffect(() => {
    let cancelled = false;
    container.readConfig().then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (config) => setStatusControl(config.statusControlEnabled),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [dependencyKey, toast]);

  return statusControl;
}
