import { describe, expect, it } from 'vitest';
import { shouldPromptBackup } from './backup.rules';

const day = (iso: string) => new Date(iso).getTime();

describe('shouldPromptBackup', () => {
  it('pergunta quando nunca perguntou antes', () => {
    expect(shouldPromptBackup(undefined, day('2026-08-15T09:00:00'))).toBe(
      true,
    );
  });

  it('não pergunta duas vezes no mesmo dia', () => {
    expect(
      shouldPromptBackup(
        day('2026-08-15T09:00:00'),
        day('2026-08-15T18:30:00'),
      ),
    ).toBe(false);
  });

  it('pergunta de novo no dia seguinte', () => {
    expect(
      shouldPromptBackup(
        day('2026-08-15T22:00:00'),
        day('2026-08-16T08:00:00'),
      ),
    ).toBe(true);
  });

  it('não pergunta quando a última foi no futuro', () => {
    expect(
      shouldPromptBackup(
        day('2026-08-16T08:00:00'),
        day('2026-08-15T08:00:00'),
      ),
    ).toBe(false);
  });
});
