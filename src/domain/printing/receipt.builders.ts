import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import type { SessionReport } from '../../application/report/report.usecases';
import { formatMoney } from '../shared/format';
import type { Receipt, ReceiptLine } from './receipt.entity';

function orderItemLines(order: Order): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  for (const item of order.items) {
    const customizationTotal = item.customizationTotal ?? 0;
    lines.push({
      label: item.name,
      qty: item.qty,
      value: formatMoney((item.salePrice + customizationTotal) * item.qty),
    });
    for (const customization of item.customizations ?? []) {
      lines.push({ label: '  + ' + customization.name });
    }
  }
  return lines;
}

export function buildOrderReceipt(
  order: Order,
  businessName: string,
  printedAt: number,
): Receipt {
  return {
    title: 'Comanda',
    businessName,
    ticket: order.ticket,
    customerName: order.customerName,
    lines: orderItemLines(order),
    total: order.total,
    footer: 'Pagar no caixa',
    printedAt,
  };
}

export function buildTabNumberReceipt(
  order: Order,
  businessName: string,
  printedAt: number,
): Receipt {
  return {
    title: 'Comanda',
    businessName,
    ticket: order.ticket,
    customerName: order.customerName,
    lines: [],
    footer: 'Guarde este número',
    printedAt,
  };
}

export function buildStockReceipt(
  products: Product[],
  businessName: string,
  printedAt: number,
): Receipt {
  return {
    title: 'Estoque atual',
    businessName,
    lines: products.map((product) => ({
      label: product.name,
      value: String(product.stock),
    })),
    printedAt,
  };
}

export function buildPendingTabsReceipt(
  orders: Order[],
  businessName: string,
  printedAt: number,
): Receipt {
  const pending = orders.filter(
    (order) => order.status === 'open' || order.status === 'pending',
  );
  return {
    title: 'Comandas pendentes',
    businessName,
    lines: pending.map((order) => ({
      label: order.ticket + ' — ' + order.customerName,
      value: formatMoney(order.total),
    })),
    total: pending.reduce((sum, order) => sum + order.total, 0),
    printedAt,
  };
}

export function buildDayReportReceipt(
  report: SessionReport,
  businessName: string,
  printedAt: number,
): Receipt {
  const { summary, byMethod, products } = report;
  const lines: ReceiptLine[] = [
    { label: 'Total de vendas', value: formatMoney(summary.totalSales) },
    { label: 'Custo', value: formatMoney(summary.totalCost) },
    { label: 'Lucro', value: formatMoney(summary.profit), emphasis: true },
    { label: 'Margem', value: summary.margin.toFixed(1) + '%' },
    { label: 'Comandas pagas', value: String(summary.paidCount) },
    ...Object.entries(byMethod).map(([method, total]) => ({
      label: method,
      value: formatMoney(total),
    })),
    ...products.map((product) => ({
      label: product.name,
      qty: product.qty,
      value: formatMoney(product.total),
    })),
  ];

  return {
    title: 'Fechamento do dia',
    businessName,
    lines,
    total: summary.totalSales,
    printedAt,
  };
}
