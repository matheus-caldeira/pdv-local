import { describe, expect, it } from 'vitest';
import { AppError } from '../domain/shared/errors';
import {
  ConnectorError,
  InfrastructureError,
  RecordNotFoundError,
  TransactionFailedError,
  UniqueConstraintError,
} from './errors';

describe('infrastructure errors', () => {
  it('all carry the infrastructure layer and a code', () => {
    const errors: InfrastructureError[] = [
      new ConnectorError('a'),
      new RecordNotFoundError('b'),
      new UniqueConstraintError('c'),
      new TransactionFailedError('d'),
    ];
    for (const error of errors) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.layer).toBe('infrastructure');
      expect(error.code).not.toBe('');
    }
  });

  it('exposes distinct codes', () => {
    expect(new ConnectorError('a').code).toBe('DB_CONNECTOR');
    expect(new RecordNotFoundError('b').code).toBe('RECORD_NOT_FOUND');
    expect(new UniqueConstraintError('c').code).toBe('UNIQUE_CONSTRAINT');
    expect(new TransactionFailedError('d').code).toBe('TRANSACTION_FAILED');
  });
});
