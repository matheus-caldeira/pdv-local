import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinancePaymentMethodManager } from './FinancePaymentMethodManager';
import type { PaymentMethod } from '../../../domain/finance/payment-method.entity';

const createMethod = vi.fn();
const updateMethod = vi.fn();
const archiveMethod = vi.fn();

let methods: PaymentMethod[] = [];

vi.mock('../../hooks/usePaymentMethods', () => ({
  usePaymentMethods: () => ({
    loading: false,
    methods,
    creditCards: methods.filter((m) => m.type === 'credit' && !m.archived),
    createMethod,
    updateMethod,
    archiveMethod,
  }),
}));

function method(overrides: Partial<PaymentMethod>): PaymentMethod {
  return {
    id: 1,
    uid: 'pm-1',
    name: 'Dinheiro',
    type: 'cash',
    closingDay: null,
    dueDay: null,
    archived: false,
    createdAt: 1700000000000,
    ...overrides,
  };
}

const CASH = method({ uid: 'pm-1', name: 'Caixa', type: 'cash' });
const CARD = method({
  uid: 'pm-2',
  name: 'Nubank',
  type: 'credit',
  closingDay: 10,
  dueDay: 17,
});
const ARCHIVED = method({
  uid: 'pm-3',
  name: 'Cartão antigo',
  type: 'credit',
  closingDay: 5,
  dueDay: 12,
  archived: true,
});

describe('FinancePaymentMethodManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    methods = [];
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the empty state when there are no active methods', () => {
    render(<FinancePaymentMethodManager />);
    expect(
      screen.getByText('Nenhum meio de pagamento cadastrado.'),
    ).toBeInTheDocument();
  });

  it('lists active payment methods', () => {
    methods = [CASH, CARD];
    render(<FinancePaymentMethodManager />);
    expect(screen.getByText('Caixa')).toBeInTheDocument();
    expect(screen.getByText('Nubank')).toBeInTheDocument();
  });

  it('opens the create modal without card fields for non-credit types', async () => {
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Dia de fechamento')).toBeNull();
    expect(within(dialog).queryByLabelText('Dia de vencimento')).toBeNull();
  });

  it('reveals card fields only when the type is credit', async () => {
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo'),
      'credit',
    );
    expect(
      within(dialog).getByLabelText('Dia de fechamento'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText('Dia de vencimento'),
    ).toBeInTheDocument();
  });

  it('creates a non-credit method and closes the modal on success', async () => {
    createMethod.mockResolvedValue(true);
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Pix loja');
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo'), 'pix');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(createMethod).toHaveBeenCalledWith({
      name: 'Pix loja',
      type: 'pix',
      closingDay: null,
      dueDay: null,
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('creates a credit method with closing and due days', async () => {
    createMethod.mockResolvedValue(true);
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Inter');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo'),
      'credit',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Dia de fechamento'),
      '8',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Dia de vencimento'),
      '15',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(createMethod).toHaveBeenCalledWith({
      name: 'Inter',
      type: 'credit',
      closingDay: 8,
      dueDay: 15,
    });
  });

  it('keeps the modal open when creating fails', async () => {
    createMethod.mockResolvedValue(false);
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Falha');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(createMethod).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables saving while the name is empty', async () => {
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('disables saving a credit method without both card days', async () => {
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Cartão');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo'),
      'credit',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    ).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText('Dia de fechamento'),
      '10',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    ).toBeDisabled();
  });

  it('edits an existing method through the modal', async () => {
    updateMethod.mockResolvedValue(true);
    methods = [CARD];
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Nubank' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Nubank');
    expect(within(dialog).getByLabelText('Dia de fechamento')).toHaveValue(10);
    const nameField = within(dialog).getByLabelText('Nome');
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'Nubank Ultravioleta');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(updateMethod).toHaveBeenCalledWith('pm-2', {
      name: 'Nubank Ultravioleta',
      type: 'credit',
      closingDay: 10,
      dueDay: 17,
    });
  });

  it('edits a non-credit method without card fields', async () => {
    updateMethod.mockResolvedValue(true);
    methods = [CASH];
    render(<FinancePaymentMethodManager />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Caixa' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Dia de fechamento')).toBeNull();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(updateMethod).toHaveBeenCalledWith('pm-1', {
      name: 'Caixa',
      type: 'cash',
      closingDay: null,
      dueDay: null,
    });
  });

  it('keeps the modal open when editing fails', async () => {
    updateMethod.mockResolvedValue(false);
    methods = [CASH];
    render(<FinancePaymentMethodManager />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Caixa' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(updateMethod).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('archives a method after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    archiveMethod.mockResolvedValue(true);
    methods = [CASH];
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Caixa' }),
    );
    expect(window.confirm).toHaveBeenCalledWith(
      'Remover o meio de pagamento "Caixa"?',
    );
    expect(archiveMethod).toHaveBeenCalledWith('pm-1');
  });

  it('does not archive when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    methods = [CASH];
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Caixa' }),
    );
    expect(archiveMethod).not.toHaveBeenCalled();
  });

  it('hides archived methods until the toggle is used', async () => {
    methods = [CASH, ARCHIVED];
    render(<FinancePaymentMethodManager />);
    expect(screen.queryByText('Cartão antigo')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar arquivados (1)' }),
    );
    const row = screen.getByText('Cartão antigo').closest('li') as HTMLElement;
    expect(within(row).getByText('arquivado')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ocultar arquivados' }),
    );
    expect(screen.queryByText('Cartão antigo')).not.toBeInTheDocument();
  });

  it('closes the modal via the backdrop without saving', async () => {
    render(<FinancePaymentMethodManager />);
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar meio de pagamento/ }),
    );
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createMethod).not.toHaveBeenCalled();
  });
});
