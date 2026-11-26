// A success or failure value, so expected failures travel as data instead of exceptions.

/** A successful outcome carrying its value. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** A failed outcome carrying a typed error. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Either a value or an error, never both. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Wraps a value as a success. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Wraps an error as a failure. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
