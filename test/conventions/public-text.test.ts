// Text that will be public stays plain: no em dashes, no machine-local paths and no work markers.
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

const TEXT_FILE =
  /\.(ts|tsx|js|json|css|html|md|yml|yaml|txt|example)$|^\.[a-z]+rc$|^\.(gitignore|editorconfig|npmrc|prettierignore)$/;

const RULES: readonly (readonly [string, RegExp])[] = [
  ['em dash', /\u2014/],
  ['machine-local path', /(^|[\s"'`(])(\/Users\/|\/home\/[a-z]|~\/\.)/],
  [
    'work marker',
    new RegExp(`\\b(${['TO', 'DO'].join('')}|${['FIX', 'ME'].join('')}|${['X', 'XX'].join('')})\\b`),
  ],
];

/** Names the rules a text breaks. */
export function textProblems(text: string): string[] {
  return RULES.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

describe('textProblems', () => {
  it('catches each rule and passes plain text', () => {
    expect(textProblems('Plain text, short sentences.')).toEqual([]);
    expect(textProblems('one \u2014 two')).toEqual(['em dash']);
    expect(textProblems(['see ', 'Users', 'someone', 'x'].join('/'))).toEqual(['machine-local path']);
    expect(textProblems(['fix', ['TO', 'DO'].join(''), 'later'].join(' '))).toEqual(['work marker']);
  });
});

describe('repository text', () => {
  it('breaks none of the rules', () => {
    const files = repoFiles().filter(
      (file) => file !== 'package-lock.json' && TEXT_FILE.test(file.split('/').pop() ?? ''),
    );
    const problems = files.flatMap((file) => textProblems(readText(file)).map((rule) => `${file}: ${rule}`));
    expect(problems).toEqual([]);
    expect(files.length).toBeGreaterThan(50);
  });
});
