export type UidSource = () => string;

export const defaultUidSource: UidSource = () => crypto.randomUUID();

export function createUid(source: UidSource = defaultUidSource): string {
  return source();
}
