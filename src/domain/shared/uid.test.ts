import { describe, expect, it } from 'vitest';
import { createUid } from './uid';

describe('createUid', () => {
  it('uses the injected source verbatim', () => {
    let counter = 0;
    const source = () => `uid-${(counter += 1)}`;
    expect(createUid(source)).toBe('uid-1');
    expect(createUid(source)).toBe('uid-2');
  });

  it('produces distinct values with the default source', () => {
    const a = createUid();
    const b = createUid();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});
