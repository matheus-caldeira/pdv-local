import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';
import {
  buildBusinessInfo,
  formatTicket,
  normalizeTicketCounter,
  normalizeTicketLimit,
} from '../../domain/config/config.rules';

export interface ConfigInput {
  name: string;
  document: string;
  phone: string;
  address: string;
  ticketLimit: number;
  ticketAutoReset: boolean;
  statusControlEnabled: boolean;
  businessTypeId: string;
  extra: Record<string, string>;
}

export interface PrinterConfigInput {
  printerDriver: 'browser' | 'bluetooth';
  printerPaperWidth: 58 | 80;
  printerAutoPrintOnClose: boolean;
}

export function makeReadConfig(repository: ConfigRepository) {
  return (): Promise<Either<AppError, BusinessConfig>> => repository.read();
}

export function makePeekTicketSuggestion(repository: ConfigRepository) {
  return async (): Promise<Either<AppError, string>> => {
    const result = await repository.read();
    if (isLeft(result)) return result;
    return right(
      formatTicket(result.right.ticketCounter, result.right.ticketLimit),
    );
  };
}

export function makeSaveConfig(repository: ConfigRepository) {
  return (input: ConfigInput): Promise<Either<AppError, BusinessConfig>> => {
    const info = buildBusinessInfo(input);
    return repository.save({
      ...info,
      ticketLimit: normalizeTicketLimit(input.ticketLimit),
      ticketAutoReset: input.ticketAutoReset,
      statusControlEnabled: input.statusControlEnabled,
      businessTypeId: input.businessTypeId,
      extra: input.extra,
    });
  };
}

export function makeResetTicketSequence(repository: ConfigRepository) {
  return (counter: number): Promise<Either<AppError, BusinessConfig>> =>
    repository.save({ ticketCounter: normalizeTicketCounter(counter) });
}

export function makeSavePrinterConfig(repository: ConfigRepository) {
  return (
    input: PrinterConfigInput,
  ): Promise<Either<AppError, BusinessConfig>> => repository.save(input);
}
