import { AppError, type ErrorLayer } from '../domain/shared/errors';

export abstract class InfrastructureError extends AppError {
  readonly layer: ErrorLayer = 'infrastructure';
}

export class ConnectorError extends InfrastructureError {
  readonly code = 'DB_CONNECTOR';
}

export class RecordNotFoundError extends InfrastructureError {
  readonly code = 'RECORD_NOT_FOUND';
}

export class UniqueConstraintError extends InfrastructureError {
  readonly code = 'UNIQUE_CONSTRAINT';
}

export class TransactionFailedError extends InfrastructureError {
  readonly code = 'TRANSACTION_FAILED';
}
