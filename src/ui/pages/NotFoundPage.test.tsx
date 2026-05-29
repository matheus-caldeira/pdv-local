import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  afterEach(cleanup);

  it('renders the heading and message', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/O endereço que você abriu não existe ou foi movido\./),
    ).toBeInTheDocument();
  });

  it('links back to the home route', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /Voltar ao início/ }),
    ).toHaveAttribute('href', '/');
  });
});
