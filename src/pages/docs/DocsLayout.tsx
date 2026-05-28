import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, ArrowLeft, ExternalLink } from 'lucide-react';
import { DOCS_PAGES } from '../../../docs/guide/manifest';
import { APP_BASE, SITE_BASE } from '../../lib/docsBase';
import './DocsLayout.css';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

// Agrupa as páginas por seção preservando a ordem do manifesto.
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
  const groups = groupBySection();

  return (
    <div className="docs-layout">
      <header className="docs-topbar">
        <a className="docs-topbar-brand" href={`${SITE_BASE}/`}>
          <img src={LOGO_URL} alt="PDV Local" /> Documentação
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
          <img src={LOGO_URL} alt="PDV Local" /> PDV Local
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
    </div>
  );
}
