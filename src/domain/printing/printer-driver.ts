export type PrinterDriver = 'browser' | 'bluetooth' | 'rawbt';

export type PaperWidth = 58 | 80;

export type PrinterCodepage =
  | 'cp860'
  | 'cp850'
  | 'cp858'
  | 'cp857'
  | 'windows1252'
  | 'iso8859-15';

export const PRINTER_CODEPAGES: { value: PrinterCodepage; label: string }[] = [
  { value: 'cp860', label: 'Português (cp860)' },
  { value: 'cp850', label: 'Multilíngue (cp850)' },
  { value: 'cp858', label: 'Multilíngue com € (cp858)' },
  { value: 'cp857', label: 'Turco (cp857)' },
  { value: 'windows1252', label: 'Latin 1 (windows1252)' },
  { value: 'iso8859-15', label: 'Latin 9 (iso8859-15)' },
];

export const CHARS_BY_PAPER_WIDTH: Record<PaperWidth, number> = {
  58: 32,
  80: 48,
};
