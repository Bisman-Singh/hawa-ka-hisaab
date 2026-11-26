// File size caps and the source line budget.
import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

/** Largest hand-written source file, in bytes. */
export const SOURCE_BYTE_CAP = 12_000;

/** Largest other file in the repository, in bytes. The lockfile is generated and exempt. */
export const OTHER_BYTE_CAP = 64_000;

/** Most lines of source outside tests and fact tables, counting code lines only. */
export const SOURCE_LINE_BUDGET = 7000;

const isSource = (file: string): boolean => /\.(ts|tsx|css|js)$/.test(file);

/** Counts lines that are neither blank nor only a comment. */
export function codeLineCount(text: string): number {
  return text.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '' && !/^(\/\/|\/\*|\*)/.test(trimmed);
  }).length;
}

describe('codeLineCount', () => {
  it('skips blank lines and comment lines', () => {
    expect(codeLineCount('// role\n\nconst a = 1;\n/**\n * doc\n */\nexport { a };\n')).toBe(2);
  });
});

describe('file sizes', () => {
  it('keeps every file under its byte cap', () => {
    const over = repoFiles()
      .filter((file) => file !== 'package-lock.json')
      .filter((file) => statSync(file).size > (isSource(file) ? SOURCE_BYTE_CAP : OTHER_BYTE_CAP));
    expect(over).toEqual([]);
  });
});

describe('source budget', () => {
  it('stays within the line budget for source outside tests and fact tables', () => {
    const files = repoFiles().filter(
      (file) => /^(src|api)\/.*\.(ts|tsx|css)$/.test(file) && !file.startsWith('src/config/facts/'),
    );
    const total = files.reduce((sum, file) => sum + codeLineCount(readText(file)), 0);
    expect(total).toBeLessThanOrEqual(SOURCE_LINE_BUDGET);
  });
});
