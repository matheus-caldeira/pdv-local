import { useCallback, useEffect, useRef, useState } from 'react';
import { container } from '../../app/container';
import { isLeft } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Order } from '../../domain/order/order.entity';
import type { Product } from '../../domain/product/product.entity';
import type { SessionReport } from '../../application/report/report.usecases';
import type { Receipt } from '../../domain/printing/receipt.entity';
import type { ReceiptPrinter } from '../../domain/printing/receipt-printer';
import {
  buildDayReportReceipt,
  buildOrderReceipt,
  buildPendingTabsReceipt,
  buildStockReceipt,
} from '../../domain/printing/receipt.builders';
import { BrowserReceiptPrinter } from '../../infrastructure/printing/browser-receipt-printer';
import { EscPosBluetoothPrinter } from '../../infrastructure/printing/escpos-bluetooth-printer';
import { useToast } from '../molecules/toast-context';

interface PrinterSettings {
  businessName: string;
  driver: 'browser' | 'bluetooth';
  paperWidth: 58 | 80;
}

function buildPrinter(
  driver: 'browser' | 'bluetooth',
  paperWidth: 58 | 80,
): ReceiptPrinter {
  return driver === 'bluetooth'
    ? new EscPosBluetoothPrinter(paperWidth)
    : new BrowserReceiptPrinter(paperWidth);
}

export function usePrint() {
  const toast = useToast();
  const [printing, setPrinting] = useState(false);
  const settingsRef = useRef<PrinterSettings>({
    businessName: '',
    driver: 'browser',
    paperWidth: 80,
  });

  useEffect(() => {
    async function load() {
      const result = await container.readConfig();
      if (isLeft(result)) return;
      settingsRef.current = {
        businessName: result.right.name,
        driver: result.right.printerDriver,
        paperWidth: result.right.printerPaperWidth,
      };
    }
    load();
  }, []);

  const printReceipt = useCallback(
    async (receipt: Receipt): Promise<boolean> => {
      setPrinting(true);
      try {
        const { driver, paperWidth } = settingsRef.current;
        const primary = buildPrinter(driver, paperWidth);
        const primaryResult = await primary.print(receipt);
        if (!isLeft(primaryResult)) return true;

        if (driver !== 'bluetooth') {
          toast((primaryResult.left as AppError).message, 'error');
          return false;
        }

        toast(
          'Impressora Bluetooth indisponível. Imprimindo pelo navegador.',
          'info',
        );
        const fallback = new BrowserReceiptPrinter(paperWidth);
        const fallbackResult = await fallback.print(receipt);
        if (isLeft(fallbackResult)) {
          toast((fallbackResult.left as AppError).message, 'error');
          return false;
        }
        return true;
      } finally {
        setPrinting(false);
      }
    },
    [toast],
  );

  const printOrder = useCallback(
    (order: Order) =>
      printReceipt(
        buildOrderReceipt(order, settingsRef.current.businessName, Date.now()),
      ),
    [printReceipt],
  );

  const printStock = useCallback(
    (products: Product[]) =>
      printReceipt(
        buildStockReceipt(
          products,
          settingsRef.current.businessName,
          Date.now(),
        ),
      ),
    [printReceipt],
  );

  const printPendingTabs = useCallback(
    (orders: Order[]) =>
      printReceipt(
        buildPendingTabsReceipt(
          orders,
          settingsRef.current.businessName,
          Date.now(),
        ),
      ),
    [printReceipt],
  );

  const printDayReport = useCallback(
    (report: SessionReport) =>
      printReceipt(
        buildDayReportReceipt(
          report,
          settingsRef.current.businessName,
          Date.now(),
        ),
      ),
    [printReceipt],
  );

  return { printOrder, printStock, printPendingTabs, printDayReport, printing };
}
