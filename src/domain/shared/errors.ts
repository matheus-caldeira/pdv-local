export type ErrorLayer = 'domain' | 'application' | 'infrastructure';

export abstract class AppError {
  abstract readonly code: string;
  abstract readonly layer: ErrorLayer;
  readonly message: string;
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    this.message = message;
    this.cause = cause;
  }
}
