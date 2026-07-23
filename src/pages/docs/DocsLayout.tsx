import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, ArrowLeft, ExternalLink, Search } from 'lucide-react';
import { DOCS_PAGES } from '../../../docs/guide/manifest';
import { APP_BASE, SITE_BASE } from '../../lib/docsBase';
import { DocsSearch } from '../../ui/organisms/DocsSearch';
import './DocsLayout.css';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

function groupBySection() {
  const groups: { section: string; pages: typeof DOCS_PAGES }[] = [];
  for (const page of DOCS_PAGES) {
    let group = groups.find((g) => g.section === page.section);
    if (!group) {
      group = { section: page.section, pages: [] };
      groups.push(group);
    }
    group.pages.push(page);
  }
  return groups;
}

export function DocsLayout() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const groups = groupBySection();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="docs-layout">
      <header className="docs-topbar">
        <a className="docs-topbar-brand" href={`${SITE_BASE}/`}>
          <img src={LOGO_URL} alt="Meu Bolso" /> Documentação
        </a>
        <button
          className="docs-menu-btn"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {open && <div className="docs-overlay" onClick={() => setOpen(false)} />}

      <aside className={`docs-sidebar ${open ? 'open' : ''}`}>
        <div className="docs-sidebar-brand">
          <img src={LOGO_URL} alt="Meu Bolso" /> Meu Bolso
          <button
            className="docs-menu-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <p className="docs-sidebar-sub">Guia de uso</p>
        <div className="docs-sidebar-actions">
          <button
            type="button"
            className="docs-sidebar-action"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar na documentação"
          >
            <Search size={15} /> Buscar{' '}
            <kbd className="docs-search-kbd">Ctrl K</kbd>
          </button>
          <a className="docs-sidebar-action" href={`${APP_BASE}/`}>
            <ExternalLink size={15} /> Abrir o app
          </a>
          <a className="docs-sidebar-action" href={`${SITE_BASE}/`}>
            <ArrowLeft size={15} /> Voltar ao site
          </a>
        </div>
        {groups.map((group) => (
          <div key={group.section}>
            <div className="docs-nav-section">{group.section}</div>
            {group.pages.map((page) => (
              <NavLink
                key={page.slug}
                to={`/${page.slug}`}
                className={({ isActive }) =>
                  `docs-nav-link ${isActive ? 'active' : ''}`
                }
                onClick={() => setOpen(false)}
              >
                {page.title}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>

      <main className="docs-main">
        <Outlet />
      </main>

      <DocsSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
