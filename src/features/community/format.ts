// Formatting for notices: plain numbers, lists, and reading numerals back out of text.

/** A number as a notice shows it: at most one decimal place, no grouping, ASCII digits in both languages. */
export function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** Joins items as "a, b and c" with the given word for and. */
export function joinList(items: readonly string[], and: string): string {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${and} ${items.slice(-1).join('')}`;
}

/** Every number written in a text, with Devanagari digits read as ASCII ones. */
export function numeralsIn(text: string): number[] {
  const ascii = text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
  return [...ascii.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

/** Items of two lists paired by position, as long as the shorter list. */
export function pairs<A, B>(left: readonly A[], right: readonly B[]): [A, B][] {
  return left.flatMap((item, index) => right.slice(index, index + 1).map((other): [A, B] => [item, other]));
}
