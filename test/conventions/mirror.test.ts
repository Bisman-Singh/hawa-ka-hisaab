// test/ mirrors src/ path for path: every source file with runtime code has a test file at the same path.
import { existsSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parse, repoFiles } from './repo.js';

function isTypeOnly(statement: ts.Statement): boolean {
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
    return true;
  }
  if (ts.isImportDeclaration(statement)) {
    return statement.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword;
  }
  return ts.isExportDeclaration(statement) && statement.isTypeOnly;
}

/** True when a file holds code that runs, not only types. */
export function hasRuntimeCode(source: ts.SourceFile): boolean {
  return !source.statements.every(isTypeOnly);
}

/** The test file paths that would mirror a source file. */
export function mirrorPaths(file: string): string[] {
  const base = file.replace(/^src\//, 'test/').replace(/\.tsx?$/, '');
  return [`${base}.test.ts`, `${base}.test.tsx`];
}

describe('hasRuntimeCode', () => {
  it('tells type-only modules from modules with code', () => {
    expect(hasRuntimeCode(parse('a.ts', "import type { A } from './a.js';\nexport type B = A;\n"))).toBe(
      false,
    );
    expect(hasRuntimeCode(parse('a.ts', 'export interface C { x: number }\nexport const d = 1;\n'))).toBe(
      true,
    );
  });
});

describe('the test tree', () => {
  it('has a mirrored test for every source file with runtime code', () => {
    const files = repoFiles().filter((file) => /^src\/.*\.tsx?$/.test(file));
    const untested = files.filter(
      (file) => hasRuntimeCode(parse(file)) && !mirrorPaths(file).some(existsSync),
    );
    expect(untested).toEqual([]);
  });
});
