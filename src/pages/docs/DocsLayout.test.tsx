import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DocsLayout } from './DocsLayout';

vi.mock('../../ui/organisms/DocsSearch', () => ({
  DocsSearch: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="Buscar na documentação">
        <button type="button" onClick={onClose}>
          fechar busca
        </button>
      </div>
    ) : null,
}));

function renderLayout() {
  return render(
    <MemoryRouter>
      <DocsLayout />
    </MemoryRouter>,
  );
}

describe('DocsLayout', () => {
  afterEach(cleanup);

  it('lista as seções de navegação', () => {
    renderLayout();
    expect(screen.getAllByText('Começar').length).toBeGreaterThan(0);
  });

  it('abre o palette com Ctrl+K', async () => {
    renderLayout();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('abre o palette com Meta+K', async () => {
    renderLayout();
    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('abre e fecha o palette pelo botão de busca da sidebar', async () => {
    renderLayout();
    await userEvent.click(
      screen.getByRole('button', { name: /buscar na documentação/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /fechar busca/i }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre e fecha o menu lateral no mobile', async () => {
    renderLayout();
    await userEvent.click(screen.getByRole('button', { name: /abrir menu/i }));
    await userEvent.click(screen.getByRole('button', { name: /fechar menu/i }));
    expect(
      screen.getByRole('button', { name: /abrir menu/i }),
    ).toBeInTheDocument();
  });

  it('fecha o menu ao clicar num link de navegação', async () => {
    renderLayout();
    await userEvent.click(screen.getByRole('button', { name: /abrir menu/i }));
    const links = screen.getAllByRole('link', { name: /Caixa/i });
    await userEvent.click(links[0]);
    expect(
      screen.getByRole('button', { name: /abrir menu/i }),
    ).toBeInTheDocument();
  });

  it('marca o link ativo conforme a rota', () => {
    render(
      <MemoryRouter initialEntries={['/caixa']}>
        <DocsLayout />
      </MemoryRouter>,
    );
    const active = screen
      .getAllByRole('link', { name: /Caixa/i })
      .find((el) => el.className.includes('active'));
    expect(active).toBeDefined();
  });

  it('fecha o menu ao clicar no overlay', async () => {
    const { container } = renderLayout();
    await userEvent.click(screen.getByRole('button', { name: /abrir menu/i }));
    const overlay = container.querySelector('.docs-overlay');
    expect(overlay).not.toBeNull();
    await userEvent.click(overlay as Element);
    expect(container.querySelector('.docs-overlay')).toBeNull();
  });
});
