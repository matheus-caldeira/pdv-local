import { useCallback, useRef, useState } from 'react';
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
  buildTabNumberReceipt,
  buildPendingTabsReceipt,
  buildStockReceipt,
} from '../../domain/printing/receipt.builders';
import type {
  PaperWidth,
  PrinterCodepage,
  PrinterDriver,
} from '../../domain/printing/printer-driver';
import { EscPosBluetoothPrinter } from '../../infrastructure/printing/escpos-bluetooth-printer';
import { RawBtReceiptPrinter } from '../../infrastructure/printing/rawbt-receipt-printer';
import {
  TriggeredReceiptPrinter,
  type PrintTrigger,
} from '../../infrastructure/printing/triggered-receipt-printer';
import { useReceiptPrintHandler } from '../molecules/receipt-print-context';
import { useToast } from '../molecules/toast-context';

interface PrinterSettings {
  businessName: string;
  driver: PrinterDriver;
  paperWidth: PaperWidth;
  codepage: PrinterCodepage;
}

function buildPrinter(
  settings: PrinterSettings,
  trigger: PrintTrigger | null,
): ReceiptPrinter {
  if (settings.driver === 'bluetooth') {
    return new EscPosBluetoothPrinter(settings.paperWidth, settings.codepage);
  }
  if (settings.driver === 'rawbt') {
    return new RawBtReceiptPrinter(settings.paperWidth, settings.codepage);
  }
  return new TriggeredReceiptPrinter(trigger);
}

export function usePrint() {
  const toast = useToast();
  const trigger = useReceiptPrintHandler();
  const [printing, setPrinting] = useState(false);
  const settingsRef = useRef<PrinterSettings>({
    businessName: '',
    driver: 'browser',
    paperWidth: 80,
    codepage: 'cp860',
  });

  const loadSettings = useCallback(async (): Promise<PrinterSettings> => {
    const result = await container.readConfig();
    if (!isLeft(result)) {
      settingsRef.current = {
        businessName: result.right.name,
        driver: result.right.printerDriver,
        paperWidth: result.right.printerPaperWidth,
        codepage: result.right.printerCodepage,
      };
    }
    return settingsRef.current;
  }, []);

  const printReceipt = useCallback(
    async (receipt: Receipt, settings: PrinterSettings): Promise<boolean> => {
      setPrinting(true);
      try {
        const primary = buildPrinter(settings, trigger);
        const primaryResult = await primary.print(receipt);
        if (!isLeft(primaryResult)) return true;

        if (settings.driver === 'browser') {
          toast((primaryResult.left as AppError).message, 'error');
          return false;
        }

        toast(
          settings.driver === 'bluetooth'
            ? 'Impressora Bluetooth indisponível. Imprimindo pelo navegador.'
            : 'RawBT indisponível. Imprimindo pelo navegador.',
          'info',
        );
        const fallback = new TriggeredReceiptPrinter(trigger);
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
    [toast, trigger],
  );

  const printOrder = useCallback(
    async (order: Order) => {
      const settings = await loadSettings();
      return printReceipt(
        buildOrderReceipt(order, settings.businessName, Date.now()),
        settings,
      );
    },
    [loadSettings, printReceipt],
  );

  const printTabNumber = useCallback(
    async (order: Order) => {
      const settings = await loadSettings();
      return printReceipt(
        buildTabNumberReceipt(order, settings.businessName, Date.now()),
        settings,
      );
    },
    [loadSettings, printReceipt],
  );

  const printStock = useCallback(
    async (products: Product[]) => {
      const settings = await loadSettings();
      return printReceipt(
        buildStockReceipt(products, settings.businessName, Date.now()),
        settings,
      );
    },
    [loadSettings, printReceipt],
  );

  const printPendingTabs = useCallback(
    async (orders: Order[]) => {
      const settings = await loadSettings();
      return printReceipt(
        buildPendingTabsReceipt(orders, settings.businessName, Date.now()),
        settings,
      );
    },
    [loadSettings, printReceipt],
  );

  const printDayReport = useCallback(
    async (report: SessionReport) => {
      const settings = await loadSettings();
      return printReceipt(
        buildDayReportReceipt(report, settings.businessName, Date.now()),
        settings,
      );
    },
    [loadSettings, printReceipt],
  );

  return {
    printOrder,
    printTabNumber,
    printStock,
    printPendingTabs,
    printDayReport,
    printing,
  };
}
