// Dependencies stay on the approved list and are pinned to exact versions.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readText } from './repo.js';

const RUNTIME = ['react', 'react-dom', 'hono', 'zod', '@google/genai', 'fast-xml-parser'];

const DEVELOPMENT = [
  'typescript',
  'vite',
  '@vitejs/plugin-react',
  'vitest',
  '@vitest/coverage-v8',
  'jsdom',
  '@testing-library/react',
  '@testing-library/user-event',
  '@testing-library/jest-dom',
  'axe-core',
  'eslint',
  'typescript-eslint',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react-hooks',
  'eslint-plugin-react',
  'prettier',
  '@playwright/test',
  '@axe-core/playwright',
  '@types/react',
  '@types/react-dom',
  '@types/node',
  '@hono/vite-dev-server',
  '@hono/node-server',
  'tsx',
];

const manifest = z
  .object({
    name: z.string(),
    engines: z.object({ node: z.string() }),
    dependencies: z.record(z.string(), z.string()),
    devDependencies: z.record(z.string(), z.string()),
  })
  .parse(JSON.parse(readText('package.json')));

const EXACT = /^\d+\.\d+\.\d+$/;

describe('package.json', () => {
  it('uses only approved runtime and development dependencies', () => {
    expect(Object.keys(manifest.dependencies).filter((name) => !RUNTIME.includes(name))).toEqual([]);
    expect(Object.keys(manifest.devDependencies).filter((name) => !DEVELOPMENT.includes(name))).toEqual([]);
  });

  it('pins every dependency to an exact version', () => {
    const all = { ...manifest.dependencies, ...manifest.devDependencies };
    expect(Object.entries(all).filter(([, version]) => !EXACT.test(version))).toEqual([]);
  });

  it('declares the Node versions the toolchain supports', () => {
    expect(manifest.engines.node).toMatch(/22/);
  });
});
