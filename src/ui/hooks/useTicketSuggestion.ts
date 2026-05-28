import { useCallback, useEffect, useState } from 'react';
import { getDatabase } from '../../infrastructure/dexie/provider-registry';
import { formatTicket } from '../../domain/config/config.rules';
import {
  CONFIG_ID,
  TICKET_DEFAULTS,
} from '../../infrastructure/dexie/dexie-database';

async function readSuggestion(): Promise<string> {
  const stored = await getDatabase().config.get(CONFIG_ID);
  const counter = stored?.ticketCounter ?? TICKET_DEFAULTS.ticketCounter;
  const limit = stored?.ticketLimit ?? TICKET_DEFAULTS.ticketLimit;
  return formatTicket(counter, limit);
}

export function useTicketSuggestion() {
  const [suggestion, setSuggestion] = useState('');

  const refresh = useCallback(async () => {
    setSuggestion(await readSuggestion());
  }, []);

  useEffect(() => {
    let cancelled = false;
    readSuggestion().then((value) => {
      if (!cancelled) setSuggestion(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { suggestion, refresh };
}
