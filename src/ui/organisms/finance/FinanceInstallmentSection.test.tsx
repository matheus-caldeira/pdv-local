import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceInstallmentSection } from './FinanceInstallmentSection';
import type {
  FamilyMember,
  FinanceCategory,
  InstallmentPlan,
} from '../../../domain/finance/finance.entity';
import type { PaymentMethod } from '../../../domain/finance/payment-method.entity';

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-home',
    name: 'Moradia',
    kind: 'expense',
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'cat-salary',
    name: 'Salário',
    kind: 'income',
    archived: false,
    createdAt: 1,
  },
  {
    id: 3,
    uid: 'cat-old',
    name: 'Antiga',
    kind: 'expense',
    archived: true,
    createdAt: 1,
  },
];

const MEMBERS: FamilyMember[] = [
  { id: 1, uid: 'member-1', name: 'Ana', archived: false, createdAt: 1 },
  { id: 2, uid: 'member-2', name: 'Bruno', archived: false, createdAt: 1 },
  { id: 3, uid: 'member-3', name: 'Carla', archived: true, createdAt: 1 },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    uid: 'method-1',
    name: 'Cartão Nubank',
    type: 'credit',
    closingDay: 3,
    dueDay: 10,
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'method-old',
    name: 'Cartão Antigo',
    type: 'credit',
    closingDay: 5,
    dueDay: 12,
    archived: true,
    createdAt: 1,
  },
];

const PLAN: InstallmentPlan = {
  id: 1,
  uid: 'plan-1',
  description: 'Geladeira',
  totalAmount: 3000,
  installmentCount: 10,
  firstMonth: '2026-08',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid: 'cat-home',
  memberUids: ['member-1'],
  paymentMethodUid: null,
  createdAt: 1,
};

const onPreview = vi.fn();
const onCreate = vi.fn();
const onDelete = vi.fn();

function renderSection(plans: InstallmentPlan[] = []) {
  return render(
    <FinanceInstallmentSection
      plans={plans}
      categories={CATEGORIES}
      members={MEMBERS}
      paymentMethods={PAYMENT_METHODS}
      currentMonth="2026-07"
      onPreview={onPreview}
      onCreate={onCreate}
      onDelete={onDelete}
    />,
  );
}

async function openForm() {
  await userEvent.click(
    screen.getByRole('button', { name: 'Novo parcelamento' }),
  );
  return screen.getByRole('dialog');
}

describe('FinanceInstallmentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onPreview.mockReturnValue([
      { month: '2026-08', amount: 150 },
      { month: '2026-09', amount: 150 },
    ]);
  });
  afterEach(cleanup);

  it('shows the empty state when there are no plans', () => {
    renderSection();
    expect(
      screen.getByText('Nenhum parcelamento cadastrado.'),
    ).toBeInTheDocument();
  });

  it('closes the form via the backdrop without creating', async () => {
    renderSection();
    await openForm();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('closes the delete confirmation via the backdrop', async () => {
    renderSection([PLAN]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir parcelamento Geladeira' }),
    );
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('lists plans with installments and total', () => {
    renderSection([PLAN]);
    expect(screen.getByText('Geladeira')).toBeInTheDocument();
    expect(screen.getByText(/10x a partir de/)).toBeInTheDocument();
    expect(screen.getByText('R$ 3000,00')).toBeInTheDocument();
  });

  it('deletes a plan after confirming the warning', async () => {
    onDelete.mockResolvedValue(true);
    renderSection([PLAN]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir parcelamento Geladeira' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/parcelas pendentes de meses abertos/i),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Excluir' }),
    );
    expect(onDelete).toHaveBeenCalledWith('plan-1');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the confirmation open when deleting fails', async () => {
    onDelete.mockResolvedValue(false);
    renderSection([PLAN]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir parcelamento Geladeira' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancels the deletion without deleting', async () => {
    renderSection([PLAN]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir parcelamento Geladeira' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('creates a plan after previewing the installments', async () => {
    onCreate.mockResolvedValue(true);
    renderSection();
    const dialog = await openForm();
    expect(
      within(dialog).queryByRole('button', { name: 'Confirmar parcelamento' }),
    ).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Descrição'), 'Sofá');
    await userEvent.type(
      within(dialog).getByLabelText('Valor total (R$)'),
      '300',
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Meio de pagamento'),
      'method-1',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    expect(onPreview).toHaveBeenCalledWith(300, 2, '2026-07');
    expect(within(dialog).getByText('Prévia das parcelas')).toBeInTheDocument();
    expect(within(dialog).getAllByText('R$ 150,00')).toHaveLength(2);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar parcelamento' }),
    );
    expect(onCreate).toHaveBeenCalledWith({
      description: 'Sofá',
      totalAmount: 300,
      installmentCount: 2,
      firstMonth: '2026-07',
      dayOfMonth: 1,
      kind: 'expense',
      categoryUid: 'cat-home',
      memberUids: ['member-1'],
      paymentMethodUid: 'method-1',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the form open when creating fails', async () => {
    onCreate.mockResolvedValue(false);
    renderSection();
    const dialog = await openForm();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar parcelamento' }),
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('previews with zeroed values when fields are blank', async () => {
    renderSection();
    const dialog = await openForm();
    await userEvent.clear(within(dialog).getByLabelText('Número de parcelas'));
    await userEvent.clear(within(dialog).getByLabelText('Dia do mês (1-31)'));
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    onCreate.mockResolvedValue(true);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    expect(onPreview).toHaveBeenCalledWith(0, 0, '2026-07');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar parcelamento' }),
    );
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAmount: 0,
        installmentCount: 0,
        dayOfMonth: 0,
        paymentMethodUid: null,
      }),
    );
  });

  it('accepts day 31 and keeps an archived payment method selectable', async () => {
    renderSection();
    const dialog = await openForm();
    expect(within(dialog).getByLabelText('Dia do mês (1-31)')).toHaveAttribute(
      'max',
      '31',
    );
    expect(
      within(dialog).queryByRole('option', { name: /Cartão Antigo/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('option', { name: 'Cartão Nubank' }),
    ).toBeInTheDocument();
  });

  it('hides the preview when it fails', async () => {
    onPreview.mockReturnValue(null);
    renderSection();
    const dialog = await openForm();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    expect(
      within(dialog).queryByText('Prévia das parcelas'),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Confirmar parcelamento' }),
    ).not.toBeInTheDocument();
  });

  it('clears the preview when total, count or first month change', async () => {
    renderSection();
    const dialog = await openForm();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    expect(within(dialog).getByText('Prévia das parcelas')).toBeInTheDocument();
    await userEvent.type(
      within(dialog).getByLabelText('Valor total (R$)'),
      '9',
    );
    expect(
      within(dialog).queryByText('Prévia das parcelas'),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    await userEvent.type(
      within(dialog).getByLabelText('Número de parcelas'),
      '3',
    );
    expect(
      within(dialog).queryByText('Prévia das parcelas'),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    fireEvent.change(within(dialog).getByLabelText('Primeiro mês'), {
      target: { value: '2026-09' },
    });
    expect(
      within(dialog).queryByText('Prévia das parcelas'),
    ).not.toBeInTheDocument();
  });

  it('disables the confirmation until a category is selected', async () => {
    renderSection();
    const dialog = await openForm();
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    expect(
      within(dialog).getByRole('button', { name: 'Confirmar parcelamento' }),
    ).toBeDisabled();
  });

  it('disables the confirmation while no member is checked', async () => {
    renderSection();
    const dialog = await openForm();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ver prévia' }),
    );
    expect(
      within(dialog).getByRole('button', { name: 'Confirmar parcelamento' }),
    ).toBeDisabled();
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    expect(
      within(dialog).getByRole('button', { name: 'Confirmar parcelamento' }),
    ).toBeEnabled();
  });

  it('hides archived categories and members from the form', async () => {
    renderSection();
    const dialog = await openForm();
    expect(
      within(dialog).queryByRole('option', { name: /Antiga/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('checkbox', { name: /Carla/ }),
    ).not.toBeInTheDocument();
  });

  it('resets the category when the kind changes and toggles members off', async () => {
    renderSection();
    const dialog = await openForm();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo'),
      'income',
    );
    expect(within(dialog).getByLabelText('Categoria')).toHaveValue('');
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    ).not.toBeChecked();
  });
});
