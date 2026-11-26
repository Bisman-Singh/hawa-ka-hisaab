// The deployment config agrees with the code: same page headers, API under /api, function region Mumbai.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PAGE_HEADERS } from '../../src/config/headers.js';
import { readText } from './repo.js';

const pair = z.strictObject({ key: z.string(), value: z.string() });
const vercelSchema = z.object({
  framework: z.string(),
  outputDirectory: z.string(),
  regions: z.array(z.string()),
  functions: z.record(z.string(), z.object({ maxDuration: z.number() })),
  rewrites: z.array(z.strictObject({ source: z.string(), destination: z.string() })),
  headers: z.array(z.strictObject({ source: z.string(), headers: z.array(pair) })),
});

const vercel = vercelSchema.parse(JSON.parse(readText('vercel.json')));

describe('vercel.json', () => {
  it('builds the Vite app into dist', () => {
    expect(vercel.framework).toBe('vite');
    expect(vercel.outputDirectory).toBe('dist');
  });

  it('runs the API function in Mumbai with a bounded duration', () => {
    expect(vercel.regions).toEqual(['bom1']);
    expect(Object.keys(vercel.functions)).toEqual(['api/index.ts']);
  });

  it('sends every /api path to the one API function', () => {
    expect(vercel.rewrites).toContainEqual({ source: '/api/(.*)', destination: '/api' });
  });

  it('sets the same page headers the code defines, on every path', () => {
    const all = vercel.headers.find((rule) => rule.source === '/(.*)');
    expect(all?.headers).toEqual(PAGE_HEADERS);
  });

  it('lets hashed assets be cached for a year', () => {
    const assets = vercel.headers.find((rule) => rule.source === '/assets/(.*)');
    expect(assets?.headers).toEqual([{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]);
  });
});
