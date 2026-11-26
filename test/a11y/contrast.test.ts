// Contrast of the colour tokens against WCAG 2.2 AA in the light and the dark scheme: 4.5 to 1 for text,
// 3 to 1 for the edges and marks people need to see, such as the focus ring, input borders and hatching.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Scheme = 'light' | 'dark';

const SCHEMES: readonly Scheme[] = ['light', 'dark'];

/** A colour pair the design puts together, the use that sets its minimum, and the minimum. */
interface Pair {
  readonly fore: string;
  readonly back: string;
  readonly use: string;
  readonly min: number;
}

const text = (fore: string, back: string, use: string): Pair => ({ fore, back, use, min: 4.5 });
const part = (fore: string, back: string, use: string): Pair => ({ fore, back, use, min: 3 });

const PAIRS: readonly Pair[] = [
  text('ink', 'paper', 'body text on the page'),
  text('ink', 'leaf', 'text on slips, sheets and fields'),
  text('ink-2', 'paper', 'hints, notes and disabled buttons'),
  text('ink-2', 'leaf', 'secondary text on slips and sheets'),
  text('royal', 'paper', 'links and link buttons'),
  text('royal', 'leaf', 'links and the working summary on slips'),
  text('on-royal', 'royal', 'button labels'),
  text('leaf', 'ink', 'the skip link and the chosen segment'),
  part('focus', 'paper', 'focus ring on the page'),
  part('focus', 'leaf', 'focus ring on slips and sheets'),
  part('ink-2', 'leaf', 'input and segment borders on fields'),
  part('ink-2', 'paper', 'input borders, leaders and quiet button edges'),
  part('ink', 'paper', 'rules, hatching and the selected hour'),
  part('ink', 'leaf', 'hatching and edges on slips'),
  part('royal', 'paper', 'the edge of a filled button'),
];

const SOURCE = readFileSync('src/ui/styles/tokens.css', 'utf8');

/** Reads a token's colour in one scheme, from a plain hex value or a light-dark() pair of hex values. */
export function tokenColour(css: string, name: string, scheme: Scheme): string {
  const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? '';
  const pair = /^light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)$/i.exec(value);
  const colour = pair ? pair[scheme === 'light' ? 1 : 2] : value;
  if (colour === undefined || !/^#[0-9a-f]{6}$/i.test(colour)) {
    throw new Error(`token --${name} has no six digit hex colour for the ${scheme} scheme`);
  }
  return colour;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two colours. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/** Every pair below its minimum in either scheme, with the ratio it reached. */
export function failingPairs(css: string): string[] {
  return SCHEMES.flatMap((scheme) =>
    PAIRS.filter(
      (pair) => contrast(tokenColour(css, pair.fore, scheme), tokenColour(css, pair.back, scheme)) < pair.min,
    ).map((pair) => `${scheme}: ${pair.fore} on ${pair.back}, ${pair.use}`),
  );
}

describe('the contrast check', () => {
  it('computes known ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('reads both schemes of a token, matching the ratios the design listed', () => {
    expect(contrast(tokenColour(SOURCE, 'ink', 'light'), tokenColour(SOURCE, 'paper', 'light'))).toBeCloseTo(
      13.42,
      1,
    );
    expect(contrast(tokenColour(SOURCE, 'ink-2', 'dark'), tokenColour(SOURCE, 'paper', 'dark'))).toBeCloseTo(
      7.81,
      1,
    );
    expect(tokenColour(':root { --band: #c00000; }', 'band', 'dark')).toBe('#c00000');
    expect(() => tokenColour(':root { --x: red; }', 'x', 'light')).toThrow('--x');
  });

  it('fails when a token is changed to a value that breaks a pair', () => {
    const faded = SOURCE.replace('--ink-2: light-dark(#43506a,', '--ink-2: light-dark(#8a95a8,');
    expect(failingPairs(faded)).toContain('light: ink-2 on paper, hints, notes and disabled buttons');
    const dimFocus = SOURCE.replace(
      '--focus: light-dark(#1b3da3, #9cc0ff)',
      '--focus: light-dark(#1b3da3, #2a3550)',
    );
    expect(failingPairs(dimFocus)).toEqual([
      'dark: focus on paper, focus ring on the page',
      'dark: focus on leaf, focus ring on slips and sheets',
    ]);
  });
});

describe('colour tokens', () => {
  it('keep every text pair at 4.5 to 1 and every interface pair at 3 to 1, in light and dark', () => {
    expect(failingPairs(SOURCE)).toEqual([]);
  });
});
