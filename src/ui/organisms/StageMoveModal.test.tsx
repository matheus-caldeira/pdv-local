import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StageMoveModal } from './StageMoveModal';

afterEach(cleanup);

function renderModal(over: Partial<Parameters<typeof StageMoveModal>[0]> = {}) {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  render(
    <StageMoveModal
      open
      ticket="001"
      currentStage="a_caminho"
      autoStages={[]}
      blockedStage={null}
      onClose={onClose}
      onSelect={onSelect}
      {...over}
    />,
  );
  return { onClose, onSelect };
}

describe('StageMoveModal', () => {
  it('renders nothing while closed', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names the order being moved', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Mover pedido #001',
    );
  });

  it('lists every stage as an option', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Aceito/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Em preparo/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Finalizado/ }),
    ).toBeInTheDocument();
  });

  it('marks the current stage and does not offer it', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /A caminho/ })).toBeDisabled();
  });

  it('reports the chosen stage', async () => {
    const { onSelect } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /Finalizado/ }));

    expect(onSelect).toHaveBeenCalledWith('finalizado');
  });

  it('warns that an automated stage will not hold the order', () => {
    renderModal({ autoStages: ['em_preparo'] });
    expect(
      screen.getByRole('button', { name: /Em preparo/ }),
    ).toHaveAccessibleName(/avança automaticamente/);
  });

  it('explains why going back was refused', () => {
    renderModal({ blockedStage: 'em_preparo' });
    expect(
      screen.getByText(/Em preparo avança automaticamente/),
    ).toBeInTheDocument();
  });

  it('omits the explanation when opened from the card menu', () => {
    renderModal();
    expect(screen.queryByText(/avança automaticamente/)).toBeNull();
  });

  it('closes from the cancel button', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
