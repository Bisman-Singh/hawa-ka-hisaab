// Tests for the plan, ask and notice hooks: each posts to its own route, and a good answer reaches its callback.
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsk, useNotice, usePlan, usePlanFor } from '../../../src/ui/data/plan-api.js';
import { sample } from '../../support/plan-fixtures.js';
import {
  askAnswer,
  communityAt,
  DELHI,
  json,
  noticeResponse,
  planResponse,
  stubApi,
} from '../plan/fixtures.js';

const household = sample('family-car-asthma');

describe('plan, ask and notice hooks', () => {
  it('asks for the plan of a request by itself and not while the request is null', async () => {
    const response = planResponse('family-car-asthma', 'poor');
    const fetcher = stubApi({ '/api/plan': () => json(response) });
    const onDone = vi.fn();
    const idle = renderHook(() => usePlanFor(null)).result;
    expect(idle.current.state).toEqual({ status: 'idle' });
    renderHook(() => usePlanFor({ household, location: DELHI, language: 'en' }, onDone));
    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(response);
    });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/plan']);
  });

  it('posts plan, ask and notice bodies on demand and hands each answer to its callback', async () => {
    const answers = [planResponse('family-car-asthma', 'poor'), askAnswer(), noticeResponse()];
    const fetcher = stubApi({
      '/api/plan': () => json(answers[0]),
      '/api/ask': () => json(answers[1]),
      '/api/notice': () => json(answers[2]),
    });
    const done = [vi.fn(), vi.fn(), vi.fn()];
    const plan = renderHook(() => usePlan(done[0])).result;
    const ask = renderHook(() => useAsk(done[1])).result;
    const notice = renderHook(() => useNotice(done[2])).result;
    act(() => {
      plan.current.run({ household, location: DELHI, language: 'en' });
      ask.current.run({ question: 'Can she play at 6?', household, location: DELHI, language: 'en' });
      notice.current.run({ community: communityAt(0), location: DELHI });
    });
    await waitFor(() => {
      expect(done.map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
    });
    done.forEach((fn, index) => {
      expect(fn).toHaveBeenCalledWith(answers[index]);
    });
    expect(fetcher.mock.calls.map(([url, init]) => `${init?.method ?? ''} ${url}`)).toEqual([
      'POST /api/plan',
      'POST /api/ask',
      'POST /api/notice',
    ]);
  });
});
