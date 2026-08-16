import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useStatusControl } from './useStatusControl';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { BusinessConfig } from '../../domain/config/config.entity';

const readConfig = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    readConfig: () => readConfig(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const CONFIG: BusinessConfig = {
  id: 1,
  name: '',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
  statusControlEnabled: true,
  businessTypeId: '',
  enabledModules: [],
  extra: {},
  printerDriver: 'browser',
  printerPaperWidth: 80,
  printerAutoPrintOnClose: false,
};

function Probe({ dependencyKey }: { dependencyKey: string }) {
  const statusControl = useStatusControl(dependencyKey);
  return <span>{statusControl ? 'ligado' : 'desligado'}</span>;
}

function renderProbe(dependencyKey: string) {
  return render(
    <ToastProvider>
      <Probe dependencyKey={dependencyKey} />
    </ToastProvider>,
  );
}

describe('useStatusControl', () => {
  beforeEach(() => {
    readConfig.mockReset();
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(cleanup);

  it('exposes the stored status control flag', async () => {
    renderProbe('/vender');
    await waitFor(() => expect(screen.getByText('ligado')).toBeInTheDocument());
  });

  it('toasts when reading the config fails', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderProbe('/vender');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha config'),
    );
    expect(screen.getByText('desligado')).toBeInTheDocument();
  });

  it('ignores a resolved read after unmount', async () => {
    let resolveRead: (value: ReturnType<typeof right>) => void = () => {};
    readConfig.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );
    const { unmount } = renderProbe('/vender');
    unmount();
    resolveRead(right(CONFIG));
    await Promise.resolve();
  });
});
