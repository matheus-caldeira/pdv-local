import { Link, useSearchParams } from 'react-router-dom';
import { useDocsSearch } from '../../ui/hooks/useDocsSearch';

export function DocsSearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const { search } = useDocsSearch();
  const results = query ? search(query) : [];

  return (
    <div className="docs-page">
      <div className="docs-prose">
        <h1>Busca</h1>
        {!query && <p>Digite algo para buscar na documentação.</p>}
        {query && results.length === 0 && (
          <p>Nada encontrado para “{query}”.</p>
        )}
        <ul>
          {results.map((result, index) => (
            <li key={`${result.slug}-${result.anchor}-${index}`}>
              <Link
                to={`/${result.slug}${result.anchor ? `#${result.anchor}` : ''}`}
              >
                {result.title}
                {result.heading ? ` › ${result.heading}` : ''}
              </Link>
              {' — '}
              <span>{result.snippet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
