import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-border bg-surface-2 p-10 text-center">
        <Compass size={40} className="text-accent" />
        <h1 className="text-xl font-extrabold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-sm text-ink-secondary">
          O endereço que você abriu não existe ou foi movido.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
        >
          <Home size={16} /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}
