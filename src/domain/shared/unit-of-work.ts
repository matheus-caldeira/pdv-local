import type { AppError } from './errors';
import type { Either } from './either';
import type { Repositories } from './repositories';

export interface UnitOfWork {
  run<A>(
    work: (repositories: Repositories) => Promise<Either<AppError, A>>,
  ): Promise<Either<AppError, A>>;
}
