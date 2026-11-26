// Measures the built bundle, gzipped, and compares it with the size budget.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Size limits in kilobytes after gzip. */
export interface Budget {
  readonly initialJsKb: number;
  readonly lazyChunkKb: number;
  readonly cssKb: number;
}

/** The budget the gate enforces. Initial JS is what the page loads before any lazy view. */
export const BUDGET: Budget = { initialJsKb: 120, lazyChunkKb: 40, cssKb: 12 };

/** Gzipped sizes in bytes of what the build produced. */
export interface BundleSizes {
  readonly initialJs: number;
  readonly lazyChunks: Readonly<Record<string, number>>;
  readonly css: number;
}

const gzipped = (file: string): number => gzipSync(readFileSync(file)).byteLength;

/** Reads a dist folder. Scripts named in index.html, as src or modulepreload, count as initial. */
export function measureBundle(distDir: string): BundleSizes {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const initial = new Set(
    [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((match) => match[1]),
  );
  const assets = readdirSync(join(distDir, 'assets')).map((name) => `assets/${name}`);
  const lazyChunks: Record<string, number> = {};
  let initialJs = 0;
  let css = 0;
  for (const asset of assets) {
    const size = gzipped(join(distDir, asset));
    if (asset.endsWith('.css')) {
      css += size;
    } else if (initial.has(asset)) {
      initialJs += size;
    } else if (asset.endsWith('.js')) {
      lazyChunks[asset] = size;
    }
  }
  return { initialJs, lazyChunks, css };
}

const kb = (bytes: number): string => (bytes / 1024).toFixed(1);

/** Lists every budget the sizes break. An empty list means the bundle is within budget. */
export function overBudget(sizes: BundleSizes, budget: Budget): string[] {
  const problems: string[] = [];
  if (sizes.initialJs > budget.initialJsKb * 1024) {
    problems.push(`initial JS ${kb(sizes.initialJs)} kB is over ${String(budget.initialJsKb)} kB`);
  }
  for (const [name, size] of Object.entries(sizes.lazyChunks)) {
    if (size > budget.lazyChunkKb * 1024) {
      problems.push(`${name} ${kb(size)} kB is over ${String(budget.lazyChunkKb)} kB`);
    }
  }
  if (sizes.css > budget.cssKb * 1024) {
    problems.push(`CSS ${kb(sizes.css)} kB is over ${String(budget.cssKb)} kB`);
  }
  return problems;
}

/** One line summarising the sizes for the gate output. */
export function describeSizes(sizes: BundleSizes): string {
  const lazy = Object.keys(sizes.lazyChunks).length;
  return `initial JS ${kb(sizes.initialJs)} kB, ${String(lazy)} lazy chunks, CSS ${kb(sizes.css)} kB, gzipped`;
}
