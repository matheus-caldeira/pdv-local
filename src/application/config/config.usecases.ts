import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';

export function makeReadConfig(repository: ConfigRepository) {
  return (): Promise<Either<AppError, BusinessConfig>> => repository.read();
}
