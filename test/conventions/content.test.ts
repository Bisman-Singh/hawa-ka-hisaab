// Content kept as data stays well formed: every sentence in a content file is plain text with whole {placeholders},
// and wherever English and Hindi sit side by side they have the same shape and fill the same placeholders.
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

const placeholders = (text: string): string =>
  [...text.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join(',');

const entriesOf = (value: object): [string, unknown][] =>
  Array.isArray(value)
    ? value.map((item, index): [string, unknown] => [String(index), item])
    : Object.entries(value);

function shapeOf(value: unknown): unknown {
  if (typeof value === 'string') {
    return `text:${placeholders(value)}`;
  }
  return typeof value === 'object' && value !== null
    ? entriesOf(value).map(([key, item]) => [key, shapeOf(item)])
    : typeof value;
}

function textProblems(text: string, path: string): string[] {
  const bad = [
    text.trim() === '' && 'empty text',
    /[{}]/.test(text.replace(/\{\w+\}/g, '')) && 'broken placeholder',
    / {2}|[\t\n]/.test(text) && 'stray spacing',
  ];
  return bad.flatMap((problem) => (problem === false ? [] : [`${path}: ${problem}`]));
}

function pairProblems(value: object, path: string): string[] {
  const entries = new Map(entriesOf(value));
  const paired = !Array.isArray(value) && [...entries.keys()].sort().join() === 'en,hi';
  const same = JSON.stringify(shapeOf(entries.get('en'))) === JSON.stringify(shapeOf(entries.get('hi')));
  return paired && !same ? [`${path}: English and Hindi differ in shape or placeholders`] : [];
}

/** What is wrong with a content value, each problem with the path where it sits. */
export function contentProblems(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    return textProblems(value, path);
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const nested = entriesOf(value).flatMap(([key, item]) => contentProblems(item, `${path}/${key}`));
  return [...pairProblems(value, path), ...nested];
}

/** Tables of regular expressions rather than sentences; their own tests compile every pattern. */
const PATTERN_TABLES: ReadonlySet<string> = new Set(['src/features/assistant/medical-terms.json']);

const isContent = (file: string): boolean =>
  /^src\/.*\.json$/.test(file) && !file.startsWith('src/server/data/') && !PATTERN_TABLES.has(file);

describe('contentProblems', () => {
  it('finds empty text, broken placeholders, stray spacing and English and Hindi that do not match', () => {
    expect(contentProblems({ a: 'Plain {name} text.' })).toEqual([]);
    expect(contentProblems({ a: '' })).toEqual(['/a: empty text']);
    expect(contentProblems({ a: 'Half {name text' })).toEqual(['/a: broken placeholder']);
    expect(contentProblems(['two  spaces'])).toEqual(['/0: stray spacing']);
    expect(contentProblems({ x: { en: '{a} b', hi: 'ख' } })).toEqual([
      '/x: English and Hindi differ in shape or placeholders',
    ]);
    expect(contentProblems({ en: { a: '{n}' }, hi: { a: '{n} ख', b: 'ग' } })).toEqual([
      ': English and Hindi differ in shape or placeholders',
    ]);
    expect(contentProblems({ en: { a: '{n}' }, hi: { a: '{n} ख' } })).toEqual([]);
  });
});

describe('content files', () => {
  it('hold well formed text, with English and Hindi side by side alike', () => {
    const files = repoFiles().filter(isContent);
    const problems = files.flatMap((file) => {
      const value: unknown = JSON.parse(readText(file));
      return contentProblems(value).map((problem) => `${file}${problem}`);
    });
    expect(problems).toEqual([]);
    expect(files.length).toBeGreaterThan(15);
  });
});
