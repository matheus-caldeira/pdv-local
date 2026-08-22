import type {
  PaperWidth,
  PrinterCodepage,
  PrinterDriver,
} from '../printing/printer-driver';

export interface BusinessConfig {
  id?: number;
  name: string;
  document: string;
  phone: string;
  address: string;
  ticketCounter: number;
  ticketLimit: number;
  ticketAutoReset: boolean;
  statusControlEnabled: boolean;
  businessTypeId: string;
  enabledModules: string[];
  extra: Record<string, string>;
  printerDriver: PrinterDriver;
  printerPaperWidth: PaperWidth;
  printerCodepage: PrinterCodepage;
  printerAutoPrintOnClose: boolean;
  lastBackupAt?: number;
  lastBackupPromptAt?: number;
}
