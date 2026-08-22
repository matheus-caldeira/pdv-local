import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CashPage } from './CashPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { CashSummary } from '../../application/cash/cash.usecases';
import type { BusinessConfig } from '../../domain/config/config.entity';

const loadCashSummary = vi.fn();
const openSession = vi.fn();
const closeSession = vi.fn();
const addCashMovement = vi.fn();
const readConfig = vi.fn();
const buildBackupSnapshot = vi.fn();
const saveBackupInfo = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    loadCashSummary: () => loadCashSummary(),
    openSession: (cashInitial: number) => openSession(cashInitial),
    closeSession: (cashFinal: number, notes: string) =>
      closeSession(cashFinal, notes),
    addCashMovement: (input: unknown) => addCashMovement(input),
    readConfig: () => readConfig(),
    buildBackupSnapshot: () => buildBackupSnapshot(),
    saveBackupInfo: (input: unknown) => saveBackupInfo(input),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const EMPTY_SUMMARY: CashSummary = {
  session: null,
  movements: [],
  salesByMethod: {},
  cashSales: 0,
  expectedCash: 0,
  pastSessions: [],
};

const ACTIVE_SUMMARY: CashSummary = {
  session: {
    id: 1,
    uid: 'session-1',
    openedAt: 1700000000000,
    closedAt: null,
    cashInitial: 50,
    cashFinal: null,
    notes: '',
  },
  movements: [
    {
      id: 10,
      uid: 'movement-10',
      sessionUid: 'session-1',
      type: 'sangria',
      amount: 20,
      reason: 'troco',
      createdAt: 1700000100000,
    },
    {
      id: 11,
      uid: 'movement-11',
      sessionUid: 'session-1',
      type: 'suprimento',
      amount: 30,
      reason: '',
      createdAt: 1700000200000,
    },
  ],
  salesByMethod: { dinheiro: 100, pix: 40, brinde: 5 },
  cashSales: 100,
  expectedCash: 160,
  pastSessions: [
    {
      id: 2,
      uid: 'session-2',
      openedAt: 1690000000000,
      closedAt: 1690003600000,
      cashInitial: 10,
      cashFinal: 200,
      notes: '',
    },
    {
      id: 3,
      uid: 'session-3',
      openedAt: 1680000000000,
      closedAt: 1680003600000,
      cashInitial: 5,
      cashFinal: null,
      notes: '',
    },
  ],
};

function renderPage() {
  return render(
    <ToastProvider>
      <CashPage />
    </ToastProvider>,
  );
}

const businessConfig = (
  over: Partial<BusinessConfig> = {},
): BusinessConfig => ({
  id: 1,
  name: 'Bar',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
  statusControlEnabled: false,
  businessTypeId: 'tab',
  enabledModules: [],
  extra: {},
  printerDriver: 'browser',
  printerPaperWidth: 80,
  printerCodepage: 'cp860',
  printerAutoPrintOnClose: false,
  ...over,
});

describe('CashPage', () => {
  beforeEach(() => {
    loadCashSummary.mockReset();
    openSession.mockReset();
    closeSession.mockReset();
    addCashMovement.mockReset();
    readConfig.mockReset();
    buildBackupSnapshot.mockReset();
    saveBackupInfo.mockReset();
    loadCashSummary.mockResolvedValue(right(EMPTY_SUMMARY));
    readConfig.mockResolvedValue(
      right(businessConfig({ lastBackupPromptAt: Date.now() })),
    );
    saveBackupInfo.mockResolvedValue(right(businessConfig()));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the open-cash card when there is no session', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abrir Caixa')).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: /Fechar Caixa/ }),
    ).not.toBeInTheDocument();
  });

  it('opens a session and clears the input on success', async () => {
    openSession.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abrir Caixa')).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByLabelText('Dinheiro Inicial (R$)'),
      '75.5',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Sessão' }));
    expect(openSession).toHaveBeenCalledWith(75.5);
    await waitFor(() =>
      expect(screen.getByLabelText('Dinheiro Inicial (R$)')).toHaveValue(null),
    );
  });

  it('defaults the initial cash to zero when input is empty', async () => {
    openSession.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abrir Caixa')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Sessão' }));
    expect(openSession).toHaveBeenCalledWith(0);
  });

  it('keeps the input when opening fails', async () => {
    openSession.mockResolvedValue(left(new FakeError('já aberto')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abrir Caixa')).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByLabelText('Dinheiro Inicial (R$)'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Sessão' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('já aberto'),
    );
    expect(screen.getByLabelText('Dinheiro Inicial (R$)')).toHaveValue(12);
  });

  it('renders the active session with totals, methods and movements', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    expect(screen.getByText('Esperado no Caixa')).toBeInTheDocument();
    expect(screen.getByText('R$ 160,00')).toBeInTheDocument();
    expect(screen.getByText('Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('brinde')).toBeInTheDocument();
    expect(screen.getByText('Movimentações')).toBeInTheDocument();
    expect(screen.getByText('troco')).toBeInTheDocument();
    expect(screen.getAllByText('Sangria').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Suprimento').length).toBeGreaterThan(0);
  });

  it('hides methods and movements sections when there are none', async () => {
    loadCashSummary.mockResolvedValue(
      right({
        ...ACTIVE_SUMMARY,
        movements: [],
        salesByMethod: {},
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('Vendas por Forma de Pagamento'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Movimentações')).not.toBeInTheDocument();
  });

  it('shows "Nenhum backup enviado" when there is no previous backup', async () => {
    loadCashSummary.mockResolvedValue(right(EMPTY_SUMMARY));
    readConfig.mockResolvedValue(
      right(businessConfig({ lastBackupAt: undefined })),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abrir Caixa')).toBeInTheDocument(),
    );
  });

  it('ignores a failed config read without crashing', async () => {
    loadCashSummary.mockResolvedValue(right(EMPTY_SUMMARY));
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abrir Caixa')).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Último backup:/)).not.toBeInTheDocument();
  });

  it('shows the formatted last backup date when there is a session open', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    readConfig.mockResolvedValue(
      right(
        businessConfig({
          lastBackupAt: new Date('2026-08-14T10:00:00').getTime(),
          lastBackupPromptAt: Date.now(),
        }),
      ),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Último backup:/)).toBeInTheDocument(),
    );
  });

  it('shows "Nenhum backup enviado" for an active session without a previous backup', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhum backup enviado')).toBeInTheDocument(),
    );
  });

  it('opens the backup prompt manually through the "Enviar Backup" button', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Enviar Backup/ }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Enviar backup do dia?' }),
    ).toBeInTheDocument();
  });

  it('prompts for backup after the first sale of the day', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    readConfig.mockResolvedValue(right(businessConfig()));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Enviar backup do dia?' }),
      ).toBeInTheDocument(),
    );
  });

  it('does not prompt again for the same session after the modal is dismissed', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    readConfig.mockResolvedValue(right(businessConfig()));
    saveBackupInfo.mockResolvedValue(
      right(businessConfig({ lastBackupPromptAt: Date.now() })),
    );
    renderPage();
    const dialog = await screen.findByRole('dialog', {
      name: 'Enviar backup do dia?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Depois' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Enviar backup do dia?' }),
      ).not.toBeInTheDocument(),
    );
    expect(saveBackupInfo).toHaveBeenCalledWith(
      expect.objectContaining({ lastBackupPromptAt: expect.any(Number) }),
    );
  });

  it('does not prompt when there is no session or no sales yet', async () => {
    loadCashSummary.mockResolvedValue(
      right({ ...ACTIVE_SUMMARY, salesByMethod: {} }),
    );
    readConfig.mockResolvedValue(right(businessConfig()));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Enviar backup do dia?' }),
    ).not.toBeInTheDocument();
  });

  it('renders past sessions', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Sessões Anteriores')).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Inicial:/)).toHaveLength(2);
    expect(screen.getAllByText(/Final:/)).toHaveLength(2);
  });

  it('registers a sangria movement through the modal', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    addCashMovement.mockResolvedValue(right({ id: 99 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Sangria/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Valor (R$)'), '15');
    await userEvent.type(
      within(dialog).getByLabelText('Motivo (opcional)'),
      'pagamento',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar' }),
    );
    expect(addCashMovement).toHaveBeenCalledWith({
      type: 'sangria',
      amount: 15,
      reason: 'pagamento',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('opens the suprimento modal with its title', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Suprimento/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Suprimento')).toBeInTheDocument();
  });

  it('defaults the movement amount to zero when empty', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    addCashMovement.mockResolvedValue(right({ id: 99 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Sangria/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(addCashMovement).toHaveBeenCalledWith({
      type: 'sangria',
      amount: 0,
      reason: '',
    });
  });

  it('keeps the movement modal open when registering fails', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    addCashMovement.mockResolvedValue(left(new FakeError('valor invalido')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Sangria/ }));
    await userEvent.type(
      within(screen.getByRole('dialog')).getByLabelText('Valor (R$)'),
      '5',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('valor invalido'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the movement modal via the backdrop without registering', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Sangria/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(addCashMovement).not.toHaveBeenCalled();
  });

  it('closes the cash through the close modal and offers the backup prompt', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    closeSession.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Fechar Caixa/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Valor esperado:/)).toBeInTheDocument();
    await userEvent.type(
      within(dialog).getByLabelText('Valor Contado no Caixa (R$)'),
      '160',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Observações (opcional)'),
      'tudo certo',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar Fechamento' }),
    );
    expect(closeSession).toHaveBeenCalledWith(160, 'tudo certo');
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Enviar backup do dia?' }),
      ).toBeInTheDocument(),
    );
  });

  it('closes the close modal via the backdrop without closing the cash', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Fechar Caixa/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(closeSession).not.toHaveBeenCalled();
  });

  it('keeps the close modal open when closing fails', async () => {
    loadCashSummary.mockResolvedValue(right(ACTIVE_SUMMARY));
    closeSession.mockResolvedValue(left(new FakeError('falha fechar')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Aberto desde/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Fechar Caixa/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar Fechamento' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha fechar'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(closeSession).toHaveBeenCalledWith(0, '');
  });
});
