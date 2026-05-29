export interface Left<E> {
  readonly _tag: 'Left';
  readonly left: E;
}

export interface Right<A> {
  readonly _tag: 'Right';
  readonly right: A;
}

export type Either<E, A> = Left<E> | Right<A>;

export const left = <E>(value: E): Either<E, never> => ({
  _tag: 'Left',
  left: value,
});

export const right = <A>(value: A): Either<never, A> => ({
  _tag: 'Right',
  right: value,
});

export const isLeft = <E, A>(either: Either<E, A>): either is Left<E> =>
  either._tag === 'Left';

export const isRight = <E, A>(either: Either<E, A>): either is Right<A> =>
  either._tag === 'Right';

export const map = <E, A, B>(
  either: Either<E, A>,
  fn: (value: A) => B,
): Either<E, B> => (isRight(either) ? right(fn(either.right)) : either);

export const flatMap = <E, A, F, B>(
  either: Either<E, A>,
  fn: (value: A) => Either<F, B>,
): Either<E | F, B> => (isRight(either) ? fn(either.right) : either);

export const fold = <E, A, B>(
  either: Either<E, A>,
  onLeft: (error: E) => B,
  onRight: (value: A) => B,
): B => (isRight(either) ? onRight(either.right) : onLeft(either.left));
