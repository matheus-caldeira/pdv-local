import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenTabModal } from './OpenTabModal';
import type { Order } from '../../domain/order/order.entity';

const openTab = vi.fn();
const suggestions = vi.fn();
let openTabs: Order[] = [];

function makeOrder(partial: Partial<Order> = {}): Order {
  return {
    id: 1,
    uid: 'order-1',
    businessTypeId: 'scout',
    sessionUid: 's-1',
    items: [],
    total: 0,
    paymentMethod: null,
    customerName: 'Maju',
    customerPhone: '',
    ticket: '042',
    stage: 'aceito',
    status: 'open',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

vi.mock('../hooks/useTabs', () => ({
  useTabs: () => ({ openTab, openTabs, loading: false }),
}));

vi.mock('../hooks/useCustomerSearch', () => ({
  useCustomerSearch: () => ({
    suggestions: suggestions(),
    searchByName: vi.fn(),
    clearByName: vi.fn(),
  }),
}));

vi.mock('../hooks/useTicketSuggestion', () => ({
  useTicketSuggestion: () => ({ suggestion: '042', refresh: vi.fn() }),
}));

describe('OpenTabModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    suggestions.mockReturnValue([]);
    openTab.mockResolvedValue(true);
    openTabs = [];
  });
  afterEach(cleanup);

  it('preenche o número da comanda com a sugestão automática', () => {
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: /comanda/i })).toHaveValue(
      '042',
    );
  });

  it('abre a comanda com o nome digitado', async () => {
    const user = userEvent.setup();
    const onOpened = vi.fn();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={onOpened}
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'Maju');
    await user.click(screen.getByRole('button', { name: /abrir comanda/i }));

    await waitFor(() => expect(openTab).toHaveBeenCalled());
    expect(openTab).toHaveBeenCalledWith('Maju', undefined);
  });

  it('chama onOpened com a comanda recém-criada', async () => {
    openTabs = [makeOrder({ ticket: '042' })];
    const user = userEvent.setup();
    const onOpened = vi.fn();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={onOpened}
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'Maju');
    await user.click(screen.getByRole('button', { name: /abrir comanda/i }));

    await waitFor(() =>
      expect(onOpened).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: '042' }),
      ),
    );
  });

  it('mostra as sugestões do cadastro com seção e responsável', async () => {
    suggestions.mockReturnValue([
      {
        uid: 'c-1',
        name: 'Maju',
        extra: { section: 'lobinho', guardian: 'Ana Paula' },
      },
    ]);
    const user = userEvent.setup();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'ma');

    expect(screen.getByRole('option', { name: /Maju/ })).toHaveTextContent(
      /Lobinho/i,
    );
    expect(screen.getByRole('option', { name: /Maju/ })).toHaveTextContent(
      /Ana Paula/,
    );
  });

  it('monta o nome no padrão ao escolher uma sugestão', async () => {
    suggestions.mockReturnValue([
      {
        uid: 'c-1',
        name: 'Maju',
        extra: { section: 'lobinho', guardian: 'Ana Paula' },
      },
    ]);
    const user = userEvent.setup();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'ma');
    await user.click(screen.getByRole('option', { name: /Maju/ }));

    expect(screen.getByLabelText(/nome/i)).toHaveValue('Maju (Lobinho)');
  });

  it('monta o nome apenas com o nome quando a sugestão não tem seção', async () => {
    suggestions.mockReturnValue([{ uid: 'c-2', name: 'Pedro', extra: {} }]);
    const user = userEvent.setup();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'pe');
    const option = screen.getByRole('option', { name: /Pedro/ });
    expect(option).not.toHaveTextContent(/Resp\.:/);
    await user.click(option);

    expect(screen.getByLabelText(/nome/i)).toHaveValue('Pedro');
  });

  it('não envia override quando o campo fica vazio ao enviar', async () => {
    const user = userEvent.setup();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    const ticketField = screen.getByRole('textbox', { name: /comanda/i });
    await user.clear(ticketField);
    await user.type(screen.getByLabelText(/nome/i), 'Maju');
    await user.click(screen.getByRole('button', { name: /abrir comanda/i }));

    await waitFor(() =>
      expect(openTab).toHaveBeenCalledWith('Maju', undefined),
    );
  });

  it('não abre comanda sem nome', async () => {
    const user = userEvent.setup();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /abrir comanda/i }));

    expect(openTab).not.toHaveBeenCalled();
    expect(screen.getByText(/informe o nome/i)).toBeInTheDocument();
  });

  it('permite editar manualmente o número da comanda', async () => {
    const user = userEvent.setup();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={vi.fn()}
      />,
    );

    const ticketField = screen.getByRole('textbox', { name: /comanda/i });
    await user.clear(ticketField);
    await user.type(ticketField, '099');
    await user.type(screen.getByLabelText(/nome/i), 'Maju');
    await user.click(screen.getByRole('button', { name: /abrir comanda/i }));

    await waitFor(() => expect(openTab).toHaveBeenCalledWith('Maju', '099'));
  });

  it('não chama onOpened quando a comanda não abre', async () => {
    openTab.mockResolvedValue(false);
    const user = userEvent.setup();
    const onOpened = vi.fn();
    render(
      <OpenTabModal
        open
        sessionUid="s-1"
        onClose={vi.fn()}
        onOpened={onOpened}
      />,
    );

    await user.type(screen.getByLabelText(/nome/i), 'Maju');
    await user.click(screen.getByRole('button', { name: /abrir comanda/i }));

    await waitFor(() => expect(openTab).toHaveBeenCalled());
    expect(onOpened).not.toHaveBeenCalled();
  });
});
