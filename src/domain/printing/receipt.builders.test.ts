import { describe, expect, it } from 'vitest';
import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import type { SessionReport } from '../../application/report/report.usecases';
import {
  buildDayReportReceipt,
  buildOrderReceipt,
  buildPendingTabsReceipt,
  buildStockReceipt,
  buildTabNumberReceipt,
} from './receipt.builders';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    uid: 'tab-1',
    businessTypeId: 'scout',
    sessionUid: 's-1',
    items: [
      { name: 'Cachorro', salePrice: 10, costPrice: 4, qty: 2 },
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 },
    ],
    total: 25,
    paymentMethod: null,
    customerName: 'Maju (Lobinha)',
    customerPhone: '',
    ticket: '042',
    stage: 'aceito',
    status: 'pending',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('buildTabNumberReceipt', () => {
  it('monta o cupom só com número e nome, sem itens nem total', () => {
    const receipt = buildTabNumberReceipt(makeOrder(), 'Grupo Escoteiro', 1000);

    expect(receipt.ticket).toBe('042');
    expect(receipt.customerName).toBe('Maju (Lobinha)');
    expect(receipt.lines).toEqual([]);
    expect(receipt.total).toBeUndefined();
    expect(receipt.footer).toBe('Guarde este número');
    expect(receipt.printedAt).toBe(1000);
  });
});

describe('buildOrderReceipt', () => {
  it('monta o cupom com número, nome, itens e total', () => {
    const receipt = buildOrderReceipt(makeOrder(), 'Grupo Escoteiro', 1000);

    expect(receipt.title).toBe('Comanda');
    expect(receipt.ticket).toBe('042');
    expect(receipt.customerName).toBe('Maju (Lobinha)');
    expect(receipt.businessName).toBe('Grupo Escoteiro');
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]).toEqual({
      label: 'Cachorro',
      qty: 2,
      value: 'R$ 20,00',
    });
    expect(receipt.total).toBe(25);
    expect(receipt.printedAt).toBe(1000);
  });

  it('inclui os adicionais como linha própria', () => {
    const order = makeOrder({
      items: [
        {
          name: 'Cachorro',
          salePrice: 10,
          costPrice: 4,
          qty: 1,
          customizations: [
            { groupName: 'Extras', name: 'Bacon', qty: 1, price: 2 },
          ],
          customizationTotal: 2,
        },
      ],
    });

    const receipt = buildOrderReceipt(order, 'Grupo Escoteiro', 1000);

    expect(receipt.lines[0]).toEqual({
      label: 'Cachorro',
      qty: 1,
      value: 'R$ 12,00',
    });
    expect(receipt.lines[1]).toEqual({ label: '  + Bacon' });
    expect(receipt.lines.some((line) => line.label.includes('Bacon'))).toBe(
      true,
    );
  });

  it('avisa que o pagamento é feito em outro lugar', () => {
    const receipt = buildOrderReceipt(makeOrder(), 'Grupo Escoteiro', 1000);
    expect(receipt.footer).toMatch(/pagar no caixa/i);
  });
});

describe('buildStockReceipt', () => {
  it('lista os produtos com a quantidade atual', () => {
    const products = [
      { uid: 'p-1', name: 'Refri', stock: 12 },
      { uid: 'p-2', name: 'Cachorro', stock: 3 },
    ] as Product[];

    const receipt = buildStockReceipt(products, 'Grupo Escoteiro', 1000);

    expect(receipt.title).toMatch(/estoque/i);
    expect(receipt.businessName).toBe('Grupo Escoteiro');
    expect(receipt.printedAt).toBe(1000);
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]).toEqual({ label: 'Refri', value: '12' });
    expect(receipt.total).toBeUndefined();
  });
});

describe('buildPendingTabsReceipt', () => {
  it('lista só as comandas em aberto e fechadas', () => {
    const orders = [
      makeOrder({
        uid: 'a',
        status: 'open',
        ticket: '001',
        customerName: 'Ana',
        total: 10,
      }),
      makeOrder({ uid: 'b', status: 'paid', ticket: '002' }),
      makeOrder({
        uid: 'c',
        status: 'pending',
        ticket: '003',
        customerName: 'Caio',
        total: 5,
      }),
    ];

    const receipt = buildPendingTabsReceipt(orders, 'Grupo Escoteiro', 1000);

    expect(receipt.title).toBe('Comandas pendentes');
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]).toEqual({
      label: '001 — Ana',
      value: 'R$ 10,00',
    });
    expect(receipt.total).toBe(15);
  });
});

describe('buildDayReportReceipt', () => {
  it('monta o fechamento com totais, formas de pagamento e ranking', () => {
    const report: SessionReport = {
      summary: {
        totalSales: 100,
        totalCost: 40,
        profit: 60,
        margin: 60,
        paidCount: 4,
      },
      byMethod: { dinheiro: 70, pix: 30 },
      products: [
        { name: 'Cachorro', qty: 5, total: 50, cost: 20 },
        { name: 'Refri', qty: 10, total: 50, cost: 20 },
      ],
      pending: [],
    };

    const receipt = buildDayReportReceipt(report, 'Grupo Escoteiro', 1000);

    expect(receipt.title).toBe('Fechamento do dia');
    expect(receipt.businessName).toBe('Grupo Escoteiro');
    expect(receipt.printedAt).toBe(1000);
    expect(receipt.total).toBe(100);
    expect(
      receipt.lines.some(
        (line) =>
          line.label === 'Total de vendas' && line.value === 'R$ 100,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Custo' && line.value === 'R$ 40,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Lucro' && line.value === 'R$ 60,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Margem' && line.value === '60.0%',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Comandas pagas' && line.value === '4',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'dinheiro' && line.value === 'R$ 70,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'pix' && line.value === 'R$ 30,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) =>
          line.label === 'Cachorro' &&
          line.qty === 5 &&
          line.value === 'R$ 50,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) =>
          line.label === 'Refri' &&
          line.qty === 10 &&
          line.value === 'R$ 50,00',
      ),
    ).toBe(true);
  });

  it('lida com relatório sem vendas por forma de pagamento nem produtos', () => {
    const report: SessionReport = {
      summary: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        margin: 0,
        paidCount: 0,
      },
      byMethod: {},
      products: [],
      pending: [],
    };

    const receipt = buildDayReportReceipt(report, 'Grupo Escoteiro', 1000);

    expect(receipt.total).toBe(0);
    expect(receipt.lines.some((line) => line.label === 'Comandas pagas')).toBe(
      true,
    );
  });
});
