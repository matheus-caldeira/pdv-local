import { forwardRef } from 'react';
import { formatMoney } from '../../domain/shared/format';
import type { PaperWidth } from '../../domain/printing/printer-driver';
import type { Receipt } from '../../domain/printing/receipt.entity';

interface ReceiptPreviewProps {
  receipt: Receipt | null;
  paperWidth: PaperWidth;
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  function ReceiptPreview({ receipt, paperWidth }, ref) {
    if (!receipt) return null;

    return (
      <div className="hidden">
        <div
          ref={ref}
          data-receipt=""
          style={{ width: `${paperWidth}mm` }}
          className="flex flex-col gap-1 bg-white px-2 py-4 font-mono text-xs text-black"
        >
          <p className="text-center font-bold uppercase">
            {receipt.businessName}
          </p>
          <p className="text-center">{receipt.title}</p>

          {receipt.ticket && (
            <p className="text-center text-lg font-bold tabular-nums">
              {receipt.ticket}
            </p>
          )}

          {receipt.customerName && (
            <p className="text-center">{receipt.customerName}</p>
          )}

          <hr className="my-1 border-t border-dashed border-black" />

          {receipt.lines.map((line, index) => (
            <div
              key={`${line.label}-${index}`}
              className="flex justify-between gap-2"
            >
              <span className={line.emphasis ? 'font-bold' : undefined}>
                {line.qty ? `${line.qty}x ${line.label}` : line.label}
              </span>
              {line.value && <span className="tabular-nums">{line.value}</span>}
            </div>
          ))}

          {receipt.total !== undefined && (
            <>
              <hr className="my-1 border-t border-dashed border-black" />
              <div className="flex justify-between gap-2 font-bold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(receipt.total)}
                </span>
              </div>
            </>
          )}

          {receipt.footer && (
            <p className="mt-2 text-center">{receipt.footer}</p>
          )}
        </div>
      </div>
    );
  },
);
