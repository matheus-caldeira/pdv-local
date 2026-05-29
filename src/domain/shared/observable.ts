export interface Subscription {
  unsubscribe(): void;
}

export interface Observable<T> {
  subscribe(next: (value: T) => void): Subscription;
}
