import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Badge } from './Badge';

afterEach(cleanup);

describe('Badge', () => {
  it('renders children with default muted tone', () => {
    render(<Badge>5 un.</Badge>);
    const badge = screen.getByText('5 un.');
    expect(badge).toHaveClass('bg-surface-inset');
    expect(badge).toHaveClass('text-ink-tertiary');
  });

  it('applies the requested tone, size and uppercase variants', () => {
    render(
      <Badge tone="danger" size="xs" uppercase className="extra">
        Sem estoque
      </Badge>,
    );
    const badge = screen.getByText('Sem estoque');
    expect(badge).toHaveClass('bg-danger-subtle');
    expect(badge).toHaveClass('text-danger');
    expect(badge).toHaveClass('px-1.5');
    expect(badge).toHaveClass('uppercase');
    expect(badge).toHaveClass('extra');
  });

  it('supports the remaining tones', () => {
    render(
      <>
        <Badge tone="success">a</Badge>
        <Badge tone="warning">b</Badge>
        <Badge tone="info">c</Badge>
        <Badge tone="accent">d</Badge>
      </>,
    );
    expect(screen.getByText('a')).toHaveClass('bg-success-subtle');
    expect(screen.getByText('b')).toHaveClass('bg-warning-subtle');
    expect(screen.getByText('c')).toHaveClass('bg-info-subtle');
    expect(screen.getByText('d')).toHaveClass('bg-accent-subtle');
  });
});
