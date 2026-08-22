import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickCustomerModal } from './QuickCustomerModal';
import { left, right } from '../../domain/shared/either';
import { InvalidCustomerError } from '../../domain/errors';
import { getBusinessType } from '../../domain/business-type/registry';
import type { Customer } from '../../domain/customer/customer.entity';

const saveCustomer = vi.fn();
const resolveActiveType = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    saveCustomer: (...args: unknown[]) => saveCustomer(...args),
    resolveActiveType: () => resolveActiveType(),
  },
}));

afterEach(() => {
  cleanup();
  saveCustomer.mockReset();
  resolveActiveType.mockReset();
});

const customer: Customer = {
  uid: 'c-1',
  name: 'Maju',
  phone: '',
  addresses: [],
  extra: { section: 'lobinho' },
  createdAt: 1,
  updatedAt: 1,
};

function renderModal(props: Partial<Parameters<typeof QuickCustomerModal>[0]>) {
  resolveActiveType.mockResolvedValue(right(getBusinessType('scout')));
  return render(
    <QuickCustomerModal
      open
      initialName="Maju"
      onClose={vi.fn()}
      onCreated={vi.fn()}
      {...props}
    />,
  );
}

describe('QuickCustomerModal', () => {
  it('não renderiza nada quando fechado', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('começa com o nome já digitado no carrinho', async () => {
    renderModal({});
    expect(await screen.findByLabelText('Nome')).toHaveValue('Maju');
  });

  it('reabre já com o novo nome inicial', async () => {
    const { rerender } = renderModal({ open: false });
    rerender(
      <QuickCustomerModal
        open
        initialName="Bento"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(await screen.findByLabelText('Nome')).toHaveValue('Bento');
  });

  it('devolve o cliente cadastrado', async () => {
    saveCustomer.mockResolvedValue(right(customer));
    const onCreated = vi.fn();
    renderModal({ onCreated });

    await userEvent.selectOptions(
      await screen.findByLabelText('Seção'),
      'lobinho',
    );
    await userEvent.type(screen.getByLabelText('Telefone'), '99887766');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(customer));
    expect(saveCustomer).toHaveBeenCalledWith(
      {
        name: 'Maju',
        phone: '99887766',
        addresses: [],
        extra: { section: 'lobinho' },
      },
      getBusinessType('scout'),
    );
  });

  it('mostra o erro devolvido pelo use case', async () => {
    saveCustomer.mockResolvedValue(
      left(new InvalidCustomerError('Informe a seção.')),
    );
    const onCreated = vi.fn();
    renderModal({ onCreated });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cadastrar' }),
    );

    expect(await screen.findByText('Informe a seção.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('não envia enquanto o tipo de negócio não carregou', async () => {
    resolveActiveType.mockResolvedValue(
      left(new InvalidCustomerError('falhou')),
    );
    render(
      <QuickCustomerModal
        open
        initialName="Maju"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled(),
    );
    expect(saveCustomer).not.toHaveBeenCalled();
  });

  it('fecha pelo Escape', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
