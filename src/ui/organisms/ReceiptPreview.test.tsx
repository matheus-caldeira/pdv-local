import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { ReceiptPreview } from './ReceiptPreview';

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Grupo Escoteiro',
  ticket: '042',
  customerName: 'Maju (Lobinha)',
  lines: [{ label: 'Refri', qty: 2, value: 'R$ 10,00' }],
  total: 12.5,
  footer: 'Pagar no caixa',
  printedAt: 1000,
};

afterEach(() => {
  cleanup();
});

describe('ReceiptPreview', () => {
  it('não renderiza nada sem cupom', () => {
    const { container } = render(
      <ReceiptPreview receipt={null} paperWidth={80} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o cabeçalho do cupom', () => {
    render(<ReceiptPreview receipt={receipt} paperWidth={80} />);

    expect(screen.getByText('Grupo Escoteiro')).toBeInTheDocument();
    expect(screen.getByText('Comanda')).toBeInTheDocument();
    expect(screen.getByText('042')).toBeInTheDocument();
    expect(screen.getByText('Maju (Lobinha)')).toBeInTheDocument();
  });

  it('lista os itens com quantidade e valor', () => {
    render(<ReceiptPreview receipt={receipt} paperWidth={80} />);

    expect(screen.getByText('2x Refri')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
  });

  it('destaca as linhas marcadas com ênfase', () => {
    const withEmphasis: Receipt = {
      ...receipt,
      lines: [
        { label: 'Subtotal', value: 'R$ 10,00', emphasis: true },
        { label: 'Refri', value: 'R$ 10,00' },
      ],
    };

    render(<ReceiptPreview receipt={withEmphasis} paperWidth={80} />);

    expect(screen.getByText('Subtotal')).toHaveClass('font-bold');
    expect(screen.getByText('Refri')).not.toHaveClass('font-bold');
  });

  it('mostra o total e o rodapé', () => {
    render(<ReceiptPreview receipt={receipt} paperWidth={80} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('R$ 12,50')).toBeInTheDocument();
    expect(screen.getByText('Pagar no caixa')).toBeInTheDocument();
  });

  it('omite comanda, cliente, total e rodapé quando ausentes', () => {
    const minimal: Receipt = {
      title: 'Estoque atual',
      businessName: 'Grupo Escoteiro',
      lines: [{ label: 'Refri' }],
      printedAt: 1000,
    };

    render(<ReceiptPreview receipt={minimal} paperWidth={58} />);

    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    expect(screen.getByText('Refri')).toBeInTheDocument();
  });

  it('aplica a largura do papel escolhida', () => {
    const { container } = render(
      <ReceiptPreview receipt={receipt} paperWidth={58} />,
    );

    const root = container.querySelector('[data-receipt]');

    expect(root).toHaveStyle({ width: '58mm' });
  });
});
