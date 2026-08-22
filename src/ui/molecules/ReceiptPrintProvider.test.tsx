import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { PrintFailedError } from '../../domain/errors';
import { container } from '../../app/container';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { ReceiptPrintProvider } from './ReceiptPrintProvider';
import { useReceiptPrintHandler } from './receipt-print-context';

const handlePrint = vi.fn();
let afterPrint: (() => void) | undefined;

vi.mock('react-to-print', () => ({
  useReactToPrint: (options: { onAfterPrint?: () => void }) => {
    afterPrint = options.onAfterPrint;
    return handlePrint;
  },
}));

vi.mock('../../app/container', () => ({
  container: { readConfig: vi.fn() },
}));

const readConfig = vi.mocked(container.readConfig);

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Grupo Escoteiro',
  lines: [{ label: 'Refri', qty: 1, value: 'R$ 5,00' }],
  printedAt: 1000,
};

function Consumer() {
  const print = useReceiptPrintHandler();
  return (
    <button type="button" onClick={() => print?.(receipt)}>
      imprimir
    </button>
  );
}

function renderProvider() {
  return render(
    <ReceiptPrintProvider>
      <Consumer />
    </ReceiptPrintProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  afterPrint = undefined;
  readConfig.mockResolvedValue(right({ printerPaperWidth: 80 } as never));
});

afterEach(() => {
  cleanup();
});

describe('ReceiptPrintProvider', () => {
  it('dispara a impressão quando um cupom é solicitado', async () => {
    renderProvider();

    screen.getByRole('button').click();

    await waitFor(() => expect(handlePrint).toHaveBeenCalled());
    expect(screen.getByText('Grupo Escoteiro')).toBeInTheDocument();
  });

  it('limpa o cupom depois que a impressão termina', async () => {
    renderProvider();

    screen.getByRole('button').click();
    await waitFor(() => expect(handlePrint).toHaveBeenCalled());

    afterPrint?.();

    await waitFor(() =>
      expect(screen.queryByText('Grupo Escoteiro')).not.toBeInTheDocument(),
    );
  });

  it('usa a largura de papel configurada', async () => {
    readConfig.mockResolvedValue(right({ printerPaperWidth: 58 } as never));

    const { container: dom } = renderProvider();

    screen.getByRole('button').click();
    await waitFor(() => expect(handlePrint).toHaveBeenCalled());

    expect(dom.querySelector('[data-receipt]')).toHaveStyle({ width: '58mm' });
  });

  it('adota a nova largura quando a config muda, sem remontar', async () => {
    const { container: dom } = renderProvider();

    screen.getByRole('button').click();
    await waitFor(() => expect(handlePrint).toHaveBeenCalled());
    expect(dom.querySelector('[data-receipt]')).toHaveStyle({ width: '80mm' });
    afterPrint?.();

    readConfig.mockResolvedValue(right({ printerPaperWidth: 58 } as never));

    screen.getByRole('button').click();
    await waitFor(() =>
      expect(dom.querySelector('[data-receipt]')).toHaveStyle({
        width: '58mm',
      }),
    );
  });

  it('mantém a largura padrão quando a config falha', async () => {
    readConfig.mockResolvedValue(left(new PrintFailedError()));

    const { container: dom } = renderProvider();

    screen.getByRole('button').click();
    await waitFor(() => expect(handlePrint).toHaveBeenCalled());

    expect(dom.querySelector('[data-receipt]')).toHaveStyle({ width: '80mm' });
  });
});
