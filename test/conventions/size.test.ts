// File size caps and the source line budget.
import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

/** Largest hand-written source file, in bytes. */
export const SOURCE_BYTE_CAP = 12_000;

/** Largest other file in the repository, in bytes. The lockfile is generated and exempt. */
export const OTHER_BYTE_CAP = 64_000;

/** Most code lines of TypeScript source outside tests and fact tables. */
export const SOURCE_LINE_BUDGET = 7000;

/** Most code lines of CSS under src, counted apart from the TypeScript budget. */
export const CSS_LINE_BUDGET = 2600;

const isSource = (file: string): boolean => /\.(ts|tsx|css|js)$/.test(file);

/** Counts lines that are neither blank nor only a comment. */
export function codeLineCount(text: string): number {
  return text.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '' && !/^(\/\/|\/\*|\*)/.test(trimmed);
  }).length;
}

/** Which budget a file counts against: TypeScript source, CSS under src, or none. */
export function budgetOf(file: string): 'ts' | 'css' | null {
  if (file.startsWith('src/config/facts/')) {
    return null;
  }
  if (/^(src|api)\/.*\.(ts|tsx)$/.test(file)) {
    return 'ts';
  }
  return /^src\/.*\.css$/.test(file) ? 'css' : null;
}

const budgetTotal = (kind: 'ts' | 'css'): number =>
  repoFiles()
    .filter((file) => budgetOf(file) === kind)
    .reduce((sum, file) => sum + codeLineCount(readText(file)), 0);

describe('codeLineCount', () => {
  it('skips blank lines and comment lines', () => {
    expect(codeLineCount('// role\n\nconst a = 1;\n/**\n * doc\n */\nexport { a };\n')).toBe(2);
    expect(codeLineCount('/* role */\n\n.a {\n  color: red;\n}\n')).toBe(3);
  });
});

describe('budgetOf', () => {
  it('counts TypeScript and CSS apart and leaves out tests, fact tables and other files', () => {
    expect(budgetOf('src/ui/App.tsx')).toBe('ts');
    expect(budgetOf('api/index.ts')).toBe('ts');
    expect(budgetOf('src/ui/styles/base.css')).toBe('css');
    expect(budgetOf('src/config/facts/bands.ts')).toBeNull();
    expect(budgetOf('test/ui/App.test.tsx')).toBeNull();
    expect(budgetOf('index.html')).toBeNull();
    expect(budgetOf('api/style.css')).toBeNull();
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
  it('stays within the line budget for TypeScript source outside tests and fact tables', () => {
    expect(budgetTotal('ts')).toBeLessThanOrEqual(SOURCE_LINE_BUDGET);
  });

  it('keeps the stylesheets within their own line budget', () => {
    const css = budgetTotal('css');
    expect(css).toBeGreaterThan(0);
    expect(css).toBeLessThanOrEqual(CSS_LINE_BUDGET);
  });
});
