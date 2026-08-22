import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useReactToPrint } from 'react-to-print';
import { container } from '../../app/container';
import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { PaperWidth } from '../../domain/printing/printer-driver';
import type { Receipt } from '../../domain/printing/receipt.entity';
import { ReceiptPreview } from '../organisms/ReceiptPreview';
import { ReceiptPrintContext } from './receipt-print-context';

interface PendingPrint {
  receipt: Receipt;
  resolve: (result: Either<AppError, void>) => void;
}

export function ReceiptPrintProvider({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingPrint | null>(null);
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(80);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const loadPaperWidth = useCallback(async () => {
    const result = await container.readConfig();
    if (isLeft(result)) return;
    setPaperWidth(result.right.printerPaperWidth);
  }, []);

  const settle = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setReceipt(null);
    pending?.resolve(right(undefined));
  }, []);

  const handlePrint = useReactToPrint({
    contentRef,
    onAfterPrint: settle,
    onPrintError: settle,
  });

  useEffect(() => {
    if (!receipt || !contentRef.current) return;
    handlePrint();
  }, [receipt, handlePrint]);

  const print = useCallback(
    async (next: Receipt) => {
      await loadPaperWidth();
      return new Promise<Either<AppError, void>>((resolve) => {
        pendingRef.current?.resolve(right(undefined));
        pendingRef.current = { receipt: next, resolve };
        setReceipt(next);
      });
    },
    [loadPaperWidth],
  );

  return (
    <ReceiptPrintContext.Provider value={print}>
      {children}
      <ReceiptPreview
        ref={contentRef}
        receipt={receipt}
        paperWidth={paperWidth}
      />
    </ReceiptPrintContext.Provider>
  );
}
