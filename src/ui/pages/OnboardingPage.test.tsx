import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { LastModuleDisabledError } from '../../domain/errors';

const completeFirstRun = vi.fn();
const refresh = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    completeFirstRun: (input: unknown) => completeFirstRun(input),
  },
}));

vi.mock('../../app/modules-context', () => ({
  useModules: () => ({
    modules: [],
    needsFirstRun: true,
    status: 'ready',
    refresh: () => refresh(),
  }),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    completeFirstRun.mockReset();
    refresh.mockReset();
    completeFirstRun.mockResolvedValue(right(['finance']));
  });
  afterEach(cleanup);

  it('offers the three module choices', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'O que você quer usar?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ponto de Venda/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Financeiro/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Os dois/ })).toBeInTheDocument();
  });

  it('completes directly with finance only', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^Financeiro/ }));
    expect(completeFirstRun).toHaveBeenCalledWith({ modules: ['finance'] });
    expect(refresh).toHaveBeenCalled();
  });

  it('asks the business type when pdv is chosen', async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole('button', { name: /Ponto de Venda/ }),
    );
    expect(
      screen.getByRole('heading', { name: 'Qual é o seu tipo de negócio?' }),
    ).toBeInTheDocument();
    expect(completeFirstRun).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Com comanda' }));
    expect(completeFirstRun).toHaveBeenCalledWith({
      modules: ['pdv'],
      businessTypeId: 'tab',
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('asks the business type when both are chosen', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Os dois/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Escoteiro' }));
    expect(completeFirstRun).toHaveBeenCalledWith({
      modules: ['pdv', 'finance'],
      businessTypeId: 'scout',
    });
  });

  it('returns to the module choices from the business type step', async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole('button', { name: /Ponto de Venda/ }),
    );
    expect(
      screen.getByRole('heading', { name: 'Qual é o seu tipo de negócio?' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(
      screen.getByRole('heading', { name: 'O que você quer usar?' }),
    ).toBeInTheDocument();
  });

  it('toasts when completing fails and does not refresh', async () => {
    completeFirstRun.mockResolvedValue(left(new LastModuleDisabledError()));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^Financeiro/ }));
    expect(
      await screen.findByText('Pelo menos um módulo precisa ficar ativo.'),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
