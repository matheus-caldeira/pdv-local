import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactModal } from './ContactModal';
import { DOCS_BASE } from '../../lib/docsBase';

describe('ContactModal', () => {
  afterEach(cleanup);

  it('renders nothing when closed', () => {
    render(<ContactModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the intro, author and every contact link when open', () => {
    render(<ContactModal open onClose={() => {}} />);
    expect(screen.getByText('Matheus Caldeira')).toBeInTheDocument();
    expect(screen.getByText(/ponto de venda gratuito/)).toBeInTheDocument();

    const docs = screen.getByRole('link', { name: /Documentação \/ Ajuda/ });
    expect(docs).toHaveAttribute('href', `${DOCS_BASE}/`);

    expect(
      screen.getByRole('link', { name: /matheuscardozo4@gmail.com/ }),
    ).toHaveAttribute('href', 'mailto:matheuscardozo4@gmail.com');

    expect(
      screen.getByRole('link', { name: /\+55 41 99524-5271/ }),
    ).toHaveAttribute('href', 'tel:+5541995245271');

    const linkedin = screen.getByRole('link', { name: /in\/caldeiramatheus/ });
    expect(linkedin).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/caldeiramatheus/',
    );
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', 'noopener');
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<ContactModal open onClose={onClose} />);
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
