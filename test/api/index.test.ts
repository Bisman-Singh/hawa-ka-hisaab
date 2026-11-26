// Tests for the Vercel function entry: it exports an app whose fetch serves the API.
import { describe, expect, it, vi } from 'vitest';

describe('api/index', () => {
  it('exports the API app with a fetch method that answers health', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { default: app } = await import('../../api/index.js');
    const response = await app.fetch(new Request('https://example.test/api/health'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });
});
