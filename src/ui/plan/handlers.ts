// Small builders for event handlers, so a handler that passes one value on reads as one expression.
import type { ChangeEvent } from 'react';

/** A handler that calls fn with value and ignores its own arguments, such as a button that picks an option. */
export function calling<A>(fn: (value: A) => void, value: A): () => void {
  return () => {
    fn(value);
  };
}

/** A change handler that passes the control's text to fn. */
export function texting(
  fn: (text: string) => void,
): (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void {
  return (event) => {
    fn(event.target.value);
  };
}
