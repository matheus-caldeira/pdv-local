import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useDocsSearch } from '../hooks/useDocsSearch';
import './DocsSearch.css';

export function DocsSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { search } = useDocsSearch();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const results = search(query);

  return (
    <div className="docs-search-overlay" role="presentation" onClick={onClose}>
      <div
        className="docs-search-modal"
        role="dialog"
        aria-label="Buscar na documentação"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="docs-search-field">
          <Search size={18} />
          <input
            type="search"
            aria-label="Buscar na documentação"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
          />
        </div>
        <ul className="docs-search-results">
          {results.map((result, index) => (
            <li key={`${result.slug}-${result.anchor}-${index}`}>
              <Link
                to={`/${result.slug}${result.anchor ? `#${result.anchor}` : ''}`}
                onClick={onClose}
              >
                <span className="docs-search-title">
                  {result.title}
                  {result.heading ? ` › ${result.heading}` : ''}
                </span>
                <span className="docs-search-snippet">{result.snippet}</span>
              </Link>
            </li>
          ))}
          {query.length >= 2 && results.length === 0 && (
            <li className="docs-search-empty">Nada encontrado.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
