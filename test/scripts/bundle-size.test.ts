// Tests for the bundle measurement and budget check, on a small dist folder written for the test.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BUDGET, describeSizes, measureBundle, overBudget } from '../../scripts/bundle-size.js';

const folders: string[] = [];

function dist(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'bundle-'));
  folders.push(root);
  mkdirSync(join(root, 'assets'));
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(root, name), text);
  }
  return root;
}

const html =
  '<script type="module" src="/assets/index-a.js"></script><link rel="modulepreload" href="/assets/vendor-b.js">';

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe('measureBundle', () => {
  it('counts scripts named in index.html as initial and the rest as lazy', () => {
    const root = dist({
      'index.html': html,
      'assets/index-a.js': 'a'.repeat(1000),
      'assets/vendor-b.js': 'b'.repeat(1000),
      'assets/compare-c.js': 'c'.repeat(1000),
      'assets/index-d.css': 'd'.repeat(1000),
      'assets/logo.svg': '<svg/>',
    });
    const sizes = measureBundle(root);
    expect(sizes.initialJs).toBeGreaterThan(0);
    expect(Object.keys(sizes.lazyChunks)).toEqual(['assets/compare-c.js']);
    expect(sizes.css).toBeGreaterThan(0);
    expect(describeSizes(sizes)).toMatch(/^initial JS [\d.]+ kB, 1 lazy chunks, CSS [\d.]+ kB, gzipped$/);
  });
});

describe('overBudget', () => {
  it('passes sizes within the budget', () => {
    expect(overBudget({ initialJs: 1024, lazyChunks: { 'assets/x.js': 1024 }, css: 1024 }, BUDGET)).toEqual(
      [],
    );
  });

  it('names each budget that is broken', () => {
    const sizes = { initialJs: 200 * 1024, lazyChunks: { 'assets/x.js': 50 * 1024 }, css: 20 * 1024 };
    expect(overBudget(sizes, BUDGET)).toEqual([
      'initial JS 200.0 kB is over 120 kB',
      'assets/x.js 50.0 kB is over 40 kB',
      'CSS 20.0 kB is over 12 kB',
    ]);
  });
});
