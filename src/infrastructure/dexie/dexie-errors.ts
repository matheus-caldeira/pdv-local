import {
  ConnectorError,
  UniqueConstraintError,
  type InfrastructureError,
} from '../errors';

export function toInfrastructureError(cause: unknown): InfrastructureError {
  const name =
    cause instanceof Error
      ? cause.name
      : String((cause as { name?: unknown })?.name ?? '');

  if (name === 'ConstraintError') {
    return new UniqueConstraintError('Registro duplicado.', cause);
  }
  return new ConnectorError('Falha ao acessar o banco de dados.', cause);
}
