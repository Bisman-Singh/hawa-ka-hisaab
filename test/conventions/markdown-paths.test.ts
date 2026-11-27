// Every repository path a markdown file cites must exist, read the way a markdown viewer resolves it.
import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

const FILE_LIKE = /^[\w.-][\w./-]*(\/|\.(ts|tsx|js|json|md|css|html|yml|yaml|xml|txt|example))$/;

const isLocal = (target: string): boolean => !/^(https?:|mailto:|#|\/)/.test(target);

const clean = (target: string): string => target.replace(/#.*$/, '').replace(/:\d+(-\d+)?$/, '');

const targets = (markdown: string, pattern: RegExp): string[] =>
  [...markdown.matchAll(pattern)]
    .map((match) => match[1] ?? '')
    .filter(isLocal)
    .map(clean)
    .filter((target) => FILE_LIKE.test(target));

/** Code spans name paths from the repository root. Links are relative to the folder of the file that holds them. */
function candidates(markdown: string, folder: string): string[] {
  const code = targets(markdown, /`([^`\s]+)`/g);
  const links = targets(markdown, /\]\(([^)\s]+)\)/g).map((target) => posix.join(folder, target));
  return [...code, ...links];
}

/** Lists the repository paths cited in a markdown text in a folder that do not exist. */
export function missingPaths(markdown: string, folder: string, exists: (path: string) => boolean): string[] {
  return [...new Set(candidates(markdown, folder))].filter((path) => !exists(path));
}

describe('missingPaths', () => {
  const markdown = [
    'See `src/lib/cache.ts:12` and [the server](src/server/app.ts#L3).',
    'Also `docs/gone.md`, `test/` and [missing](./nowhere.ts).',
    'Not paths: `npm run gate`, `/api/health`, [site](https://example.org/a.ts), [top](#top).',
  ].join('\n');

  it('checks code spans and relative links, and ignores URLs, anchors, API paths and commands', () => {
    const present = new Set(['src/lib/cache.ts', 'src/server/app.ts', 'test/']);
    expect(missingPaths(markdown, '.', (path) => present.has(path))).toEqual(['docs/gone.md', 'nowhere.ts']);
  });

  it('reads a link from the folder of its file and a code span from the repository root', () => {
    const inDocs =
      'See [the readme](../README.md), [decisions](decisions.md), [gone](../docs/gone.md) and `src/lib/cache.ts`.';
    const present = new Set(['README.md', 'docs/decisions.md', 'src/lib/cache.ts']);
    expect(missingPaths(inDocs, 'docs', (path) => present.has(path))).toEqual(['docs/gone.md']);
    expect(missingPaths('[the readme](README.md)', 'docs', (path) => present.has(path))).toEqual([
      'docs/README.md',
    ]);
  });
});

describe('markdown in the repository', () => {
  it('cites only paths that exist', () => {
    const problems = repoFiles()
      .filter((file) => file.endsWith('.md'))
      .flatMap((file) =>
        missingPaths(readText(file), posix.dirname(file), existsSync).map((path) => `${file}: ${path}`),
      );
    expect(problems).toEqual([]);
  });
});
