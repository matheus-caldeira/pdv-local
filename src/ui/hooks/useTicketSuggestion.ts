import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';

export function useTicketSuggestion() {
  const [suggestion, setSuggestion] = useState('');

  const refresh = useCallback(async () => {
    const result = await container.peekTicketSuggestion();
    fold(
      result,
      () => setSuggestion(''),
      (value) => setSuggestion(value),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    container.peekTicketSuggestion().then((result) => {
      if (cancelled) return;
      fold(
        result,
        () => setSuggestion(''),
        (value) => setSuggestion(value),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { suggestion, refresh };
}
