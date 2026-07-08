import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { right } from '../../domain/shared/either';
import { getBusinessType } from '../../domain/business-type/registry';

vi.mock('../../app/container', () => ({
  container: {
    resolveActiveType: async () => right(getBusinessType('scout')!),
  },
}));

import { useActiveBusinessType } from './useActiveBusinessType';

function Probe() {
  const { definition } = useActiveBusinessType();
  return <span>{definition?.id ?? 'carregando'}</span>;
}

describe('useActiveBusinessType', () => {
  it('expõe a definição do tipo ativo', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('scout')).toBeInTheDocument());
  });
});
