import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';
import {
  buildBusinessInfo,
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
}

export function makeReadConfig(repository: ConfigRepository) {
  return (): Promise<Either<AppError, BusinessConfig>> => repository.read();
}

export function makeSaveConfig(repository: ConfigRepository) {
  return (input: ConfigInput): Promise<Either<AppError, BusinessConfig>> => {
    const info = buildBusinessInfo(input);
    return repository.save({
      ...info,
      ticketLimit: normalizeTicketLimit(input.ticketLimit),
      ticketAutoReset: input.ticketAutoReset,
      statusControlEnabled: input.statusControlEnabled,
    });
  };
}

export function makeResetTicketSequence(repository: ConfigRepository) {
  return (counter: number): Promise<Either<AppError, BusinessConfig>> =>
    repository.save({ ticketCounter: normalizeTicketCounter(counter) });
}
