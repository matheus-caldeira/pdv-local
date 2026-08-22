import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Autocomplete, type AutocompleteOption } from './Autocomplete';

afterEach(cleanup);

const options: AutocompleteOption[] = [
  { value: 'c-1', label: 'Maju', hint: 'Lobinho' },
  { value: 'c-2', label: 'Pedro' },
];

describe('Autocomplete', () => {
  it('não mostra a lista quando não há opções', () => {
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={[]}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('avisa a cada tecla digitada', async () => {
    const onChange = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={[]}
        onChange={onChange}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Cliente'), 'ma');

    expect(onChange).toHaveBeenCalled();
  });

  it('seleciona uma opção com o clique', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('option', { name: /Maju/ }));

    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('navega com as setas e confirma com Enter', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('sobe com a seta para cima', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('fecha a lista com Esc', async () => {
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ignora Enter quando nada está destacado', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));
    await userEvent.keyboard('{Enter}');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('sobe para o último item quando nada está destacado', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('reseta o item destacado quando as opções mudam', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');

    rerender(
      <Autocomplete
        label="Cliente"
        value="p"
        options={[...options]}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.keyboard('{Enter}');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('mostra a dica da opção', async () => {
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));

    expect(screen.getByText('Lobinho')).toBeInTheDocument();
  });
});
