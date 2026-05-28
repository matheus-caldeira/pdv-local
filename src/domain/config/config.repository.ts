import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { BusinessConfig } from './config.entity';

export interface ConfigRepository {
  read(): Promise<Either<InfrastructureError, BusinessConfig>>;
  claimTicket(): Promise<Either<InfrastructureError, string>>;
}
