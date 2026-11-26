// Finds every numeral in a text: digits of any script, number words in English and Hindi, percentages, times of day
// and dates. Pollutant and unit names such as PM2.5, CO2, N95 and m3 are names, not numbers.
import { MONTH_NAMES, NUMBER_WORDS } from './numeral-words.js';
import {
  dateBy,
  normalizeNumerals,
  readNumbers,
  readWord,
  timeBy,
  type Numeral,
  type Read,
} from './numeral-readers.js';

/** The numeral types, defined with their readers. */
export type { DateNumeral, Numeral, NumberNumeral, TimeNumeral } from './numeral-readers.js';

interface Found {
  readonly numeral: Numeral;
  readonly start: number;
  readonly end: number;
}

const alternation = (keys: Iterable<string>): string =>
  [...keys].sort((a, b) => b.length - a.length).join('|');
const MONTH = alternation(MONTH_NAMES.keys());
const END = '(?![\\p{L}\\p{M}\\p{N}])';
const MERIDIEM = '\\s*([ap])\\.?\\s?m\\.?(?!\\p{L})';
const YEAR = '(?:,?\\s*(\\d{4})(?!\\d))?';
const NAMES = new RegExp(
  '(?<![\\p{L}\\p{N}])(?:(?:pm|पीएम)\\s?(?:2\\.5|10|1)(?![\\p{N}.])|(?:co2e?|no2|so2|nh3|o3|n9[59]|kn95|ffp[123])' +
    `${END})|(?<!\\p{L})(?:k?m|cm|ft)[23]${END}`,
  'giu',
);
const RANGE_GAP = /^\s*(?:-|–|to|se|से)\s*$/iu;

const SCANNERS: readonly (readonly [RegExp, Read])[] = [
  [/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/gu, dateBy({ day: 3, month: 2, year: 1, named: false })],
  [
    /(?<![\d.])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/gu,
    dateBy({ day: 1, month: 2, year: 3, named: false }),
  ],
  [
    new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s*(${MONTH})\\.?${END}${YEAR}`, 'giu'),
    dateBy({ day: 1, month: 2, year: 3, named: true }),
  ],
  [
    new RegExp(`(?<![\\p{L}\\p{M}])(${MONTH})\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)${YEAR}`, 'giu'),
    dateBy({ day: 2, month: 1, year: 3, named: true }),
  ],
  [
    new RegExp(`(?<![\\d.:])(\\d{1,2}):(\\d{2})(?![\\d:])(?:${MERIDIEM})?`, 'giu'),
    timeBy({ hour: 1, minute: 2, half: 3 }),
  ],
  [
    new RegExp(`(?<![\\d.:])(\\d{1,2})(?:\\.(\\d{2}))?${MERIDIEM}`, 'giu'),
    timeBy({ hour: 1, minute: 2, half: 3 }),
  ],
  [/(?<![\d.:])(\d{1,2})(?::(\d{2}))?\s*(?:बजे|baje|o['’]clock)/giu, timeBy({ hour: 1, minute: 2, half: 0 })],
  [/\d[\d,]*(?:\.\d+)?|\.\d+/gu, readNumbers],
  [new RegExp(`(?<![\\p{L}\\p{M}])(?:${alternation(NUMBER_WORDS.keys())})${END}`, 'giu'), readWord],
];

const blank = (text: string, start: number, end: number): string =>
  text.slice(0, start) + ' '.repeat(end - start) + text.slice(end);

function widenRanges(found: readonly Found[], text: string): Numeral[] {
  return found.map(({ numeral, end }, index) => {
    const next = found[index + 1];
    const joined = next?.numeral.kind === 'number' && next.numeral.percent && numeral.kind === 'number';
    return joined && RANGE_GAP.test(text.slice(end, next.start)) ? { ...numeral, percent: true } : numeral;
  });
}

/** Every numeral in a text, in reading order. Each span is read once, by the first pattern that recognises it. */
export function findNumerals(text: string): Numeral[] {
  const normal = normalizeNumerals(text);
  let rest = normal.replace(NAMES, (name) => ' '.repeat(name.length));
  const found: Found[] = [];
  for (const [pattern, read] of SCANNERS) {
    for (const match of rest.matchAll(pattern)) {
      const end = match.index + match[0].length;
      const numerals = read(match);
      found.push(...numerals.map((numeral) => ({ numeral, start: match.index, end })));
      rest = numerals.length > 0 ? blank(rest, match.index, end) : rest;
    }
  }
  return widenRanges(
    found.sort((a, b) => a.start - b.start),
    normal,
  );
}
