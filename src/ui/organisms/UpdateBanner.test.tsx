import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateBanner } from './UpdateBanner';

const applyUpdate = vi.fn();
const state = { updateAvailable: false };

vi.mock('../hooks/useAppUpdate', () => ({
  useAppUpdate: () => ({ ...state, applyUpdate }),
}));

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateAvailable = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('fica escondido quando não há atualização', () => {
    render(<UpdateBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('aparece quando há atualização disponível', () => {
    state.updateAvailable = true;
    render(<UpdateBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(
      /atualização disponível/i,
    );
  });

  it('aplica a atualização ao clicar em reiniciar', async () => {
    state.updateAvailable = true;
    const user = userEvent.setup();
    render(<UpdateBanner />);

    await user.click(screen.getByRole('button', { name: /reiniciar agora/i }));

    expect(applyUpdate).toHaveBeenCalled();
  });

  it('some ao ser dispensado', async () => {
    state.updateAvailable = true;
    const user = userEvent.setup();
    render(<UpdateBanner />);

    await user.click(screen.getByRole('button', { name: /dispensar/i }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(applyUpdate).not.toHaveBeenCalled();
  });
});
