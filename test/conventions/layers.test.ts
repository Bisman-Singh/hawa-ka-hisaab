// The layer rule: features never import server or ui, ui never imports server, lib and config stay at the bottom.
// Packages are held to the layers that need them, so no server or model SDK ends up in the browser bundle.
import { dirname, join, normalize } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codeFiles, importsOf, parse } from './repo.js';

type Layer = 'config' | 'lib' | 'features' | 'server' | 'ui' | 'api';

const MAY_IMPORT: Readonly<Record<Layer, readonly Layer[]>> = {
  config: ['config', 'lib'],
  lib: ['lib'],
  features: ['config', 'lib', 'features'],
  server: ['config', 'lib', 'features', 'server'],
  ui: ['config', 'lib', 'features', 'ui'],
  api: ['server'],
};

const PACKAGES: Readonly<Record<Layer, RegExp>> = {
  config: /^zod$/,
  lib: /^zod$/,
  features: /^(zod|fast-xml-parser)$/,
  server: /^(zod|hono(\/.*)?|@google\/genai|fast-xml-parser|node:.*)$/,
  ui: /^(zod|react|react-dom(\/client)?)$/,
  api: /^$/,
};

const LAYERS: readonly Layer[] = ['config', 'lib', 'features', 'server', 'ui', 'api'];

function layerOf(path: string): Layer | null {
  const match = /^(?:src\/(config|lib|features|server|ui)|(api))\//.exec(path);
  const name = match?.[1] ?? match?.[2];
  return LAYERS.find((layer) => layer === name) ?? null;
}

/** Lists the imports of one file that break the layer rule or the package rule. */
export function layerViolations(file: string, imports: readonly string[]): string[] {
  const from = layerOf(file);
  if (from === null) {
    return [];
  }
  return imports.flatMap((specifier) => {
    if (!specifier.startsWith('.')) {
      return PACKAGES[from].test(specifier) ? [] : [`${file} imports package ${specifier}`];
    }
    const to = layerOf(normalize(join(dirname(file), specifier)));
    return to !== null && MAY_IMPORT[from].includes(to) ? [] : [`${file} imports ${specifier}`];
  });
}

describe('layerViolations', () => {
  it('catches a feature importing the server or the ui', () => {
    expect(layerViolations('src/features/air/x.ts', ['../../server/app.js'])).toEqual([
      'src/features/air/x.ts imports ../../server/app.js',
    ]);
    expect(layerViolations('src/features/air/x.ts', ['../../ui/App.js'])).toHaveLength(1);
  });

  it('catches the ui importing the server and lib importing a feature', () => {
    expect(layerViolations('src/ui/x.ts', ['../server/mount.js'])).toHaveLength(1);
    expect(layerViolations('src/lib/x.ts', ['../features/air/schemas.js'])).toHaveLength(1);
  });

  it('catches a package used in the wrong layer', () => {
    expect(layerViolations('src/ui/x.ts', ['hono'])).toEqual(['src/ui/x.ts imports package hono']);
    expect(layerViolations('src/ui/x.ts', ['@google/genai'])).toHaveLength(1);
    expect(layerViolations('src/features/x.ts', ['node:fs'])).toHaveLength(1);
  });

  it('allows the permitted directions', () => {
    expect(
      layerViolations('src/server/x.ts', ['../features/air/schemas.js', 'hono/route', 'node:fs']),
    ).toEqual([]);
    expect(
      layerViolations('src/ui/x.ts', ['../lib/result.js', '../config/app.js', 'react-dom/client']),
    ).toEqual([]);
    expect(layerViolations('test/x.ts', ['../src/server/app.js'])).toEqual([]);
  });
});

describe('the source tree', () => {
  it('keeps to the layer rule', () => {
    const files = codeFiles().filter((file) => layerOf(file) !== null);
    expect(files.flatMap((file) => layerViolations(file, importsOf(parse(file))))).toEqual([]);
  });
});
