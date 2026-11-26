// Every source file opens with a one or two line comment saying what it is for.
import { describe, expect, it } from 'vitest';
import { codeFiles, readText, repoFiles } from './repo.js';

function cssProblem(lines: readonly string[]): string | null {
  const closes = lines.slice(0, 2).some((line) => line.includes('*/'));
  return lines[0]?.startsWith('/* ') && closes
    ? null
    : 'must open with a /* role */ comment of one or two lines';
}

/** Returns a reason when the text does not open with a role comment of one or two lines. */
export function roleCommentProblem(file: string, text: string): string | null {
  const lines = text.split('\n');
  if (file.endsWith('.css')) {
    return cssProblem(lines);
  }
  const leading = lines.findIndex((line) => !line.startsWith('//'));
  if (leading === 0 || !lines[0]?.startsWith('// ')) {
    return 'must open with a // role comment';
  }
  return leading > 2 ? 'role comment must be one or two lines' : null;
}

describe('roleCommentProblem', () => {
  it('accepts one or two comment lines and refuses none or three', () => {
    expect(roleCommentProblem('a.ts', '// Does a thing.\nimport x from "y";')).toBeNull();
    expect(roleCommentProblem('a.ts', '// Does a thing.\n// And why.\n\nexport {};')).toBeNull();
    expect(roleCommentProblem('a.ts', 'import x from "y";')).toBe('must open with a // role comment');
    expect(roleCommentProblem('a.ts', '//no space')).toBe('must open with a // role comment');
    expect(roleCommentProblem('a.ts', '// one\n// two\n// three\n')).toBe(
      'role comment must be one or two lines',
    );
    expect(roleCommentProblem('a.css', '/* Tokens. */\n:root {}')).toBeNull();
    expect(roleCommentProblem('a.css', ':root {}')).not.toBeNull();
  });
});

describe('every source file', () => {
  it('opens with a role comment', () => {
    const files = [...codeFiles(), ...repoFiles().filter((file) => /^src\/.*\.css$/.test(file))];
    const problems = files
      .map((file) => [file, roleCommentProblem(file, readText(file))])
      .filter(([, p]) => p !== null);
    expect(problems).toEqual([]);
    expect(files.length).toBeGreaterThan(50);
  });
});
