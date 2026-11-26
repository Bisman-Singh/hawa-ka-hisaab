// Every export in source, scripts and test support carries a /** doc comment */.
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { codeFiles, parse } from './repo.js';

function isExported(statement: ts.Statement): boolean {
  if (ts.isExportAssignment(statement) || ts.isExportDeclaration(statement)) {
    return true;
  }
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function hasDocComment(source: ts.SourceFile, statement: ts.Statement): boolean {
  const ranges = ts.getLeadingCommentRanges(source.text, statement.getFullStart()) ?? [];
  return ranges.some((range) => source.text.slice(range.pos, range.end).startsWith('/**'));
}

/** Names the exported statements of a file that have no doc comment, by line number. */
export function undocumentedExports(file: string, text?: string): string[] {
  const source = parse(file, text);
  return source.statements
    .filter((statement) => isExported(statement) && !hasDocComment(source, statement))
    .map(
      (statement) => `${file}:${String(source.getLineAndCharacterOfPosition(statement.getStart()).line + 1)}`,
    );
}

describe('undocumentedExports', () => {
  it('finds exports without a doc comment and accepts documented ones', () => {
    const text = [
      '// Role.',
      '/** Documented. */',
      'export const a = 1;',
      '// Not a doc comment.',
      'export function b(): void {}',
      'export default 3;',
      'const c = 2;',
    ].join('\n');
    expect(undocumentedExports('x.ts', text)).toEqual(['x.ts:5', 'x.ts:6']);
  });
});

describe('every export', () => {
  it('has a doc comment', () => {
    const files = codeFiles().filter((file) => /^(src|api|scripts|test\/support)\//.test(file));
    expect(files.flatMap((file) => undocumentedExports(file))).toEqual([]);
  });
});
