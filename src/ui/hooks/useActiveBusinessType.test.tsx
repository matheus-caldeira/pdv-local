import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { left, right, type Either } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import {
  getBusinessType,
  type BusinessTypeDefinition,
} from '../../domain/business-type/registry';

type ResolveActiveTypeResult = Either<AppError, BusinessTypeDefinition>;

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const resolveActiveType = vi.fn<() => Promise<ResolveActiveTypeResult>>(
  async () => right(getBusinessType('scout')!),
);

vi.mock('../../app/container', () => ({
  container: {
    resolveActiveType: () => resolveActiveType(),
  },
}));

import { useActiveBusinessType } from './useActiveBusinessType';

function Probe() {
  const { definition, error } = useActiveBusinessType();
  return <span>{error ?? definition?.id ?? 'carregando'}</span>;
}

describe('useActiveBusinessType', () => {
  afterEach(cleanup);

  it('expõe a definição do tipo ativo', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('scout')).toBeInTheDocument());
  });

  it('expõe a mensagem de erro quando a resolução falha', async () => {
    resolveActiveType.mockResolvedValueOnce(left(new FakeError('falhou')));
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('falhou')).toBeInTheDocument());
  });

  it('ignora a resolução quando o componente desmonta antes dela terminar', async () => {
    let resolvePromise: (value: ResolveActiveTypeResult) => void;
    resolveActiveType.mockReturnValueOnce(
      new Promise<ResolveActiveTypeResult>((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolvePromise!(right(getBusinessType('scout')!));
    await Promise.resolve();
  });
});
