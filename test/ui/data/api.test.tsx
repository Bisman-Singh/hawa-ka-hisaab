// Tests for the typed route hooks: each one calls its route with checked input and the coordinates rounded.
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  roundCoordinate,
  useAir,
  useAsk,
  useIntake,
  useNotice,
  usePlaces,
  usePlan,
} from '../../../src/ui/data/api.js';
import { sampleCommunity, sampleHousehold } from '../../support/samples.js';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const air = {
  reading: { path: 'unavailable', reason: 'feed_and_model_down' },
  feed: { fetch: 'failed', feedHour: null, stale: false },
  forecast: null,
  grap: null,
};

function stubFetch(response: () => Response) {
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(response()),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('route hooks', () => {
  it('rounds coordinates to two decimals before they reach a URL', () => {
    expect(roundCoordinate(28.6543)).toBe(28.65);
    expect(roundCoordinate(77.3149)).toBe(77.31);
  });

  it('searches places and reads the air for a rounded location, keeping the reading', async () => {
    const fetcher = stubFetch(() => json({ places: [] }));
    const places = renderHook(() => usePlaces('Lucknow'));
    await waitFor(() => {
      expect(places.result.current.state).toEqual({ status: 'done', data: { places: [] } });
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/places?q=Lucknow');
    fetcher.mockImplementation(() => Promise.resolve(json(air)));
    const onDone = vi.fn();
    renderHook(() => useAir({ lat: 28.6543, lon: 77.3149 }, onDone));
    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(air);
    });
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/air?lat=28.65&lon=77.31');
    expect(renderHook(() => useAir(null)).result.current.state).toEqual({ status: 'idle' });
  });

  it('posts intake, plan, ask and notice bodies to their routes', async () => {
    const fetcher = stubFetch(() =>
      json({ error: { code: 'internal', message: 'Failed.', issues: [] } }, 500),
    );
    const location = { lat: 28.65, lon: 77.31 };
    const household = sampleHousehold();
    const intake = renderHook(() => useIntake()).result;
    const plan = renderHook(() => usePlan()).result;
    const ask = renderHook(() => useAsk()).result;
    const notice = renderHook(() => useNotice()).result;
    act(() => {
      intake.current.run({ text: 'Two adults and a child.' });
      plan.current.run({ household, location, language: 'en' });
      ask.current.run({ question: 'Can she play at 6?', household, location, language: 'en' });
      notice.current.run({ community: sampleCommunity(), location });
    });
    await waitFor(() => {
      expect([intake, plan, ask, notice].map((hook) => hook.current.state.status)).toEqual([
        'failed',
        'failed',
        'failed',
        'failed',
      ]);
    });
    expect(fetcher.mock.calls.map(([url, init]) => `${init?.method ?? ''} ${url}`)).toEqual([
      'POST /api/intake',
      'POST /api/plan',
      'POST /api/ask',
      'POST /api/notice',
    ]);
  });
});
