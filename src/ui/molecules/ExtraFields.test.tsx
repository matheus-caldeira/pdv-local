import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ExtraFields } from './ExtraFields';

afterEach(cleanup);

describe('ExtraFields', () => {
  it('renderiza campos declarados do tipo ativo inline', () => {
    render(
      <ExtraFields
        businessTypeId="scout"
        scope="customer"
        value={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Seção')).toBeInTheDocument();
    expect(screen.getByLabelText('Responsável')).toBeInTheDocument();
    expect(
      screen.queryByText('Ver outras informações'),
    ).not.toBeInTheDocument();
  });

  it('mostra órfãos sob "Ver outras informações"', () => {
    render(
      <ExtraFields
        businessTypeId="scout"
        scope="customer"
        value={{ section: 'lobinho', legado: 'x' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Ver outras informações')).toBeInTheDocument();
    expect(screen.getByText('legado')).toBeInTheDocument();
  });

  it('sem órfãos não mostra o disclosure', () => {
    render(
      <ExtraFields
        businessTypeId="quick_sale"
        scope="customer"
        value={{}}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByText('Ver outras informações'),
    ).not.toBeInTheDocument();
  });
});
