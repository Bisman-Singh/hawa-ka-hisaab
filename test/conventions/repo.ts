// Helpers for convention tests: the repository's files, read through git so ignored files are never opened.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

/** Every file git would track: committed or new, minus anything ignored or excluded. */
export function repoFiles(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter((file) => file !== '' && existsSync(file));
}

/** TypeScript and JavaScript files written by hand, in source, tests, scripts and root configs. */
export function codeFiles(): string[] {
  return repoFiles().filter((file) =>
    /^(src|api|scripts|test|e2e)\/.*\.(ts|tsx)$|^[^/]+\.config\.(ts|js)$/.test(file),
  );
}

/** Reads a repository file as text. */
export function readText(file: string): string {
  return readFileSync(file, 'utf8');
}

/** Parses a file into a TypeScript syntax tree. */
export function parse(file: string, text: string = readText(file)): ts.SourceFile {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

function specifierOf(node: ts.Node): ts.Expression | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return node.arguments[0];
  }
  return undefined;
}

/** The module specifiers a file imports or re-exports, static and dynamic. */
export function importsOf(source: ts.SourceFile): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const specifier = specifierOf(node);
    if (specifier && ts.isStringLiteral(specifier)) {
      found.push(specifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
