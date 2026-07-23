import { useEffect, useRef, useState } from 'react';
import {
  searchDocs,
  type DocSearchResult,
} from '../../domain/docs/search-engine';
import type { DocSearchEntry } from '../../domain/docs/search-index';
import { docsSearchIndexUrl } from '../../lib/docsBase';

export function useDocsSearch(): {
  ready: boolean;
  search: (query: string) => DocSearchResult[];
} {
  const [ready, setReady] = useState(false);
  const entries = useRef<DocSearchEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(docsSearchIndexUrl())
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: DocSearchEntry[]) => {
        if (!cancelled) entries.current = data;
      })
      .catch(() => {
        if (!cancelled) entries.current = [];
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    search: (query: string) => searchDocs(entries.current, query),
  };
}
