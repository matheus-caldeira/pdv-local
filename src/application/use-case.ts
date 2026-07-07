import type { Either } from '../domain/shared/either';
import { isLeft } from '../domain/shared/either';
import type { AppError } from '../domain/shared/errors';
import type { Repositories } from '../domain/shared/repositories';
import type { UnitOfWork } from '../domain/shared/unit-of-work';

export interface UseCaseContext {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

class MapContext implements UseCaseContext {
  private readonly store = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }
}

export abstract class UseCase<Input, Output> {
  protected readonly context: UseCaseContext = new MapContext();

  constructor(protected readonly uow: UnitOfWork) {}

  protected abstract pre(
    input: Input,
    repositories: Repositories,
  ): Promise<Either<AppError, void>>;
  protected abstract execute(
    input: Input,
    repositories: Repositories,
  ): Promise<Either<AppError, void>>;
  protected abstract post(
    input: Input,
    repositories: Repositories,
  ): Promise<Either<AppError, Output>>;

  run(input: Input): Promise<Either<AppError, Output>> {
    return this.uow.run<Output>(async (repositories) => {
      const pre = await this.pre(input, repositories);
      if (isLeft(pre)) return pre;
      const executed = await this.execute(input, repositories);
      if (isLeft(executed)) return executed;
      return this.post(input, repositories);
    });
  }
}
