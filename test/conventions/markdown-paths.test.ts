// Every repository path a markdown file cites must exist.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

const FILE_LIKE = /^[\w.-][\w./-]*(\/|\.(ts|tsx|js|json|md|css|html|yml|yaml|xml|txt|example))$/;

function candidates(markdown: string): string[] {
  const code = [...markdown.matchAll(/`([^`\s]+)`/g)].map((match) => match[1] ?? '');
  const links = [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? '');
  return [...code, ...links]
    .filter((target) => !/^(https?:|mailto:|#|\/)/.test(target))
    .map((target) => target.replace(/#.*$/, '').replace(/:\d+(-\d+)?$/, ''))
    .filter((target) => FILE_LIKE.test(target));
}

/** Lists the repository paths cited in a markdown text that do not exist. */
export function missingPaths(markdown: string, exists: (path: string) => boolean): string[] {
  return [...new Set(candidates(markdown))].filter((path) => !exists(path));
}

describe('missingPaths', () => {
  it('checks code spans and relative links, and ignores URLs, anchors, API paths and commands', () => {
    const markdown = [
      'See `src/lib/cache.ts:12` and [the server](src/server/app.ts#L3).',
      'Also `docs/gone.md`, `test/` and [missing](./nowhere.ts).',
      'Not paths: `npm run gate`, `/api/health`, [site](https://example.org/a.ts), [top](#top).',
    ].join('\n');
    const present = new Set(['src/lib/cache.ts', 'src/server/app.ts', 'test/']);
    expect(missingPaths(markdown, (path) => present.has(path))).toEqual(['docs/gone.md', './nowhere.ts']);
  });
});

describe('markdown in the repository', () => {
  it('cites only paths that exist', () => {
    const problems = repoFiles()
      .filter((file) => file.endsWith('.md'))
      .flatMap((file) => missingPaths(readText(file), existsSync).map((path) => `${file}: ${path}`));
    expect(problems).toEqual([]);
  });
});
