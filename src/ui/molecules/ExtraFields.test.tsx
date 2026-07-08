import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('não renderiza nada para um tipo de negócio desconhecido', () => {
    const { container } = render(
      <ExtraFields
        businessTypeId="inexistente"
        scope="customer"
        value={{}}
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('altera um campo select e mescla o valor no onChange', async () => {
    const onChange = vi.fn();
    render(
      <ExtraFields
        businessTypeId="scout"
        scope="customer"
        value={{ guardian: 'Ana' }}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Seção'), 'lobinho');
    expect(onChange).toHaveBeenCalledWith({
      guardian: 'Ana',
      section: 'lobinho',
    });
  });

  it('altera um campo texto e mescla o valor no onChange', async () => {
    const onChange = vi.fn();
    render(
      <ExtraFields
        businessTypeId="scout"
        scope="customer"
        value={{ section: 'lobinho' }}
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByLabelText('Responsável'), 'M');
    expect(onChange).toHaveBeenCalledWith({
      section: 'lobinho',
      guardian: 'M',
    });
  });
});
