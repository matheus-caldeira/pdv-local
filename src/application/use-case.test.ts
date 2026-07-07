import { describe, expect, it, vi } from 'vitest';
import { UseCase } from './use-case';
import type { Repositories } from '../domain/shared/repositories';
import type { UnitOfWork } from '../domain/shared/unit-of-work';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../domain/shared/either';
import { AppError, type ErrorLayer } from '../domain/shared/errors';

class TestError extends AppError {
  readonly code = 'TEST_ERROR';
  readonly layer: ErrorLayer = 'application';
}

const fakeRepositories = {} as Repositories;

class SpyUseCase extends UseCase<number, string> {
  private readonly calls: string[];
  private readonly failAt?: 'pre' | 'execute' | 'post';

  constructor(
    uow: UnitOfWork,
    calls: string[],
    failAt?: 'pre' | 'execute' | 'post',
  ) {
    super(uow);
    this.calls = calls;
    this.failAt = failAt;
  }
  protected async pre(input: number): Promise<Either<AppError, void>> {
    this.calls.push('pre');
    this.context.set('doubled', input * 2);
    return this.failAt === 'pre' ? left(new TestError('x')) : right(undefined);
  }
  protected async execute(): Promise<Either<AppError, void>> {
    this.calls.push('execute');
    return this.failAt === 'execute'
      ? left(new TestError('x'))
      : right(undefined);
  }
  protected async post(): Promise<Either<AppError, string>> {
    this.calls.push('post');
    if (this.failAt === 'post') return left(new TestError('x'));
    return right(`value:${this.context.get<number>('doubled')}`);
  }
}

describe('UseCase', () => {
  it('roda pre→execute→post dentro de um único uow.run e devolve o output do post', async () => {
    const calls: string[] = [];
    const run = vi.fn(
      async (work: (r: Repositories) => Promise<Either<AppError, string>>) =>
        work(fakeRepositories),
    );
    const uow = { run } as unknown as UnitOfWork;
    const result = await new SpyUseCase(uow, calls).run(21);
    expect(run).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['pre', 'execute', 'post']);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toBe('value:42');
  });

  it('aborta num Left no pre, pulando execute e post', async () => {
    const calls: string[] = [];
    const uow = {
      run: async (
        work: (r: Repositories) => Promise<Either<AppError, string>>,
      ) => work(fakeRepositories),
    } as UnitOfWork;
    const result = await new SpyUseCase(uow, calls, 'pre').run(1);
    expect(calls).toEqual(['pre']);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TEST_ERROR');
  });

  it('aborta num Left no execute, pulando post', async () => {
    const calls: string[] = [];
    const uow = {
      run: async (
        work: (r: Repositories) => Promise<Either<AppError, string>>,
      ) => work(fakeRepositories),
    } as UnitOfWork;
    await new SpyUseCase(uow, calls, 'execute').run(1);
    expect(calls).toEqual(['pre', 'execute']);
  });

  it('propaga um Left do post', async () => {
    const calls: string[] = [];
    const uow = {
      run: async (
        work: (r: Repositories) => Promise<Either<AppError, string>>,
      ) => work(fakeRepositories),
    } as UnitOfWork;
    const result = await new SpyUseCase(uow, calls, 'post').run(1);
    expect(calls).toEqual(['pre', 'execute', 'post']);
    expect(isLeft(result)).toBe(true);
  });
});
