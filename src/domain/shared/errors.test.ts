import { describe, expect, it } from 'vitest';
import { AppError, type ErrorLayer } from './errors';

class SampleError extends AppError {
  readonly code = 'SAMPLE';
  readonly layer: ErrorLayer = 'domain';
}

describe('AppError', () => {
  it('stores message and code', () => {
    const error = new SampleError('something failed');
    expect(error.message).toBe('something failed');
    expect(error.code).toBe('SAMPLE');
    expect(error.layer).toBe('domain');
    expect(error.cause).toBeUndefined();
  });

  it('keeps the original cause', () => {
    const cause = new Error('native');
    const error = new SampleError('wrapped', cause);
    expect(error.cause).toBe(cause);
  });

  it('is an instance of AppError', () => {
    expect(new SampleError('x')).toBeInstanceOf(AppError);
  });
});
