// Tests for the first screen's route hooks: each calls its route with checked input, the coordinates rounded, and
// hands a successful answer to its completion callback.
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { roundCoordinate, useAir, useIntake, usePlaces } from '../../../src/ui/data/api.js';

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
    const found = vi.fn();
    const places = renderHook(() => usePlaces({ q: 'Lucknow', turn: 1 }, found));
    await waitFor(() => {
      expect(places.result.current.state).toEqual({ status: 'done', data: { places: [] } });
    });
    expect(found).toHaveBeenCalledWith({ places: [] });
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

  it('asks the same place again when the search turn changes', async () => {
    const fetcher = stubFetch(() => json({ places: [] }));
    const places = renderHook(({ turn }) => usePlaces({ q: 'Pune', turn }), { initialProps: { turn: 1 } });
    await waitFor(() => {
      expect(places.result.current.state.status).toBe('done');
    });
    places.rerender({ turn: 2 });
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('posts the intake text and hands the answer to the callback', async () => {
    const answer = {
      outcome: 'unavailable',
      reason: 'disabled',
      trace: {
        producedBy: 'rules',
        modelId: null,
        fallbackReason: 'disabled',
        factsSent: [],
        modelReply: null,
        toolCalls: [],
        numberCheck: { status: 'not_run', attempts: 0, unmatched: [] },
        cached: false,
      },
    };
    const fetcher = stubFetch(() => json(answer));
    const onDone = vi.fn();
    const intake = renderHook(() => useIntake(onDone)).result;
    act(() => {
      intake.current.run({ text: 'Two adults and a child.' });
    });
    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(answer);
    });
    expect(fetcher.mock.calls.map(([url, init]) => `${init?.method ?? ''} ${url}`)).toEqual([
      'POST /api/intake',
    ]);
  });
});
