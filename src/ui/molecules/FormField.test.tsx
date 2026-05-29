import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FormField } from './FormField';

afterEach(cleanup);

describe('FormField', () => {
  it('renders the label and child without hint', () => {
    render(
      <FormField label="Nome" className="extra">
        <input aria-label="Nome do campo" />
      </FormField>,
    );
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do campo')).toBeInTheDocument();
    expect(
      screen.getByText('Nome').closest('label')!.parentElement,
    ).toHaveClass('extra');
  });

  it('renders the hint when provided', () => {
    render(
      <FormField label="Estoque" hint="0 = sem limite">
        <input aria-label="estoque" />
      </FormField>,
    );
    expect(screen.getByText('0 = sem limite')).toBeInTheDocument();
  });
});
