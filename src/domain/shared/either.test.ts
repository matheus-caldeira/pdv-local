import { describe, expect, it } from 'vitest';
import { flatMap, fold, isLeft, isRight, left, map, right } from './either';

describe('either', () => {
  it('creates a Left holding the error', () => {
    const result = left('boom');
    expect(result).toEqual({ _tag: 'Left', left: 'boom' });
  });

  it('creates a Right holding the value', () => {
    const result = right(42);
    expect(result).toEqual({ _tag: 'Right', right: 42 });
  });

  it('narrows with isLeft', () => {
    expect(isLeft(left('e'))).toBe(true);
    expect(isLeft(right(1))).toBe(false);
  });

  it('narrows with isRight', () => {
    expect(isRight(right(1))).toBe(true);
    expect(isRight(left('e'))).toBe(false);
  });

  it('maps the Right value', () => {
    expect(map(right(2), (n) => n * 3)).toEqual(right(6));
  });

  it('leaves a Left untouched when mapping', () => {
    expect(map(left('e'), (n: number) => n * 3)).toEqual(left('e'));
  });

  it('chains with flatMap on Right', () => {
    expect(flatMap(right(2), (n) => right(n + 1))).toEqual(right(3));
  });

  it('short-circuits flatMap on Left', () => {
    expect(flatMap(left('e'), (n: number) => right(n + 1))).toEqual(left('e'));
  });

  it('folds a Right using onRight', () => {
    expect(
      fold(
        right(5),
        () => 'left',
        (n) => `right:${n}`,
      ),
    ).toBe('right:5');
  });

  it('folds a Left using onLeft', () => {
    expect(
      fold(
        left('e'),
        (error) => `left:${error}`,
        () => 'right',
      ),
    ).toBe('left:e');
  });
});
