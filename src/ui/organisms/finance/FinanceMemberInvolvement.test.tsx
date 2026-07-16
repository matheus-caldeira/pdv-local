import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FinanceMemberInvolvement } from './FinanceMemberInvolvement';
import type { MemberInvolvement } from '../../../application/finance/dashboard.usecases';

const INVOLVEMENT: MemberInvolvement[] = [
  { memberUid: 'member-1', name: 'Ana', total: 800.5, percent: 66.67 },
  { memberUid: 'member-2', name: 'Bruno', total: 400, percent: 33.33 },
];

describe('FinanceMemberInvolvement', () => {
  afterEach(cleanup);

  it('renders nothing when there is no involvement', () => {
    const { container } = render(<FinanceMemberInvolvement involvement={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one row per member with total and percent', () => {
    render(<FinanceMemberInvolvement involvement={INVOLVEMENT} />);
    expect(
      screen.getByRole('region', { name: 'Envolvimento por membro' }),
    ).toBeVisible();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('R$ 800,50')).toBeInTheDocument();
    expect(screen.getByText('(67%)')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
    expect(screen.getByText('R$ 400,00')).toBeInTheDocument();
    expect(screen.getByText('(33%)')).toBeInTheDocument();
  });

  it('renders a progress bar sized by the percent', () => {
    render(<FinanceMemberInvolvement involvement={INVOLVEMENT} />);
    const bar = screen.getByRole('progressbar', { name: 'Ana' });
    expect(bar).toHaveAttribute('aria-valuenow', '67');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('66.67%');
  });
});
