// Tests for the app factory: not found, errors, same-origin, body limit and the request log.
import { describe, expect, it } from 'vitest';
import { MAX_BODY_BYTES } from '../../src/config/limits.js';
import { createApp } from '../../src/server/app.js';
import { createFakeClock } from '../support/fake-clock.js';
import { createTestDeps } from '../support/test-deps.js';

describe('createApp', () => {
  it('answers unknown paths with a JSON not found and the security headers', async () => {
    const app = createApp(createTestDeps().deps);
    for (const path of ['/api/nothing-here', '/elsewhere']) {
      const response = await app.request(path);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'not_found' } });
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });

  it('refuses cross-site API requests', async () => {
    const app = createApp(createTestDeps().deps);
    const response = await app.request('/api/health', { headers: { 'sec-fetch-site': 'cross-site' } });
    expect(response.status).toBe(403);
  });

  it('refuses oversized API bodies', async () => {
    const app = createApp(createTestDeps().deps);
    const response = await app.request('/api/health', {
      method: 'POST',
      body: 'x'.repeat(MAX_BODY_BYTES + 1),
    });
    expect(response.status).toBe(413);
  });

  it('turns an unexpected error into a plain 500 and logs only the error name', async () => {
    const clock = createFakeClock();
    let calls = 0;
    const flaky = {
      now: () => {
        calls += 1;
        if (calls === 2) {
          throw new RangeError('internal detail with /srv/path and a household note');
        }
        return clock.now();
      },
    };
    const test = createTestDeps({ clock: flaky });
    const response = await createApp(test.deps).request('/api/health');
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toMatch(/internal detail|RangeError|\/srv\/|at /);
    expect(JSON.parse(text)).toMatchObject({ error: { code: 'internal' } });
    const logged = test.logText();
    expect(logged).toContain('"errorName":"RangeError"');
    expect(logged).not.toContain('household note');
  });

  it('answers a thrown value that is not an Error with a JSON 500 that still carries the headers', async () => {
    let calls = 0;
    const clock = createFakeClock();
    const flaky = {
      now: () => {
        calls += 1;
        if (calls === 2) {
          const thrown: unknown = 'a household description';
          throw thrown;
        }
        return clock.now();
      },
    };
    const test = createTestDeps({ clock: flaky });
    const response = await createApp(test.deps).request('/api/health');
    expect(response.status).toBe(500);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(await response.json()).toMatchObject({ error: { code: 'internal' } });
    expect(test.logText()).not.toContain('household');
  });

  it('writes one request line per request', async () => {
    const test = createTestDeps();
    await createApp(test.deps).request('/api/health');
    expect(test.logLines.map((entry): unknown => JSON.parse(entry.line))).toEqual([
      expect.objectContaining({ event: 'request', route: '/api/health', status: 200 }),
    ]);
  });
});
