// Tests for the screen calls: each posts its body to its own route through the API client.
import { describe, expect, it } from 'vitest';
import { askCall, noticeCall, planCall } from '../../../src/ui/plan/calls.js';
import { sample } from '../../support/plan-fixtures.js';
import { askAnswer, communityAt, DELHI, json, noticeResponse, planResponse, stubApi } from './fixtures.js';

describe('calls', () => {
  it('post plan, ask and notice bodies to their routes and read the checked answers', async () => {
    const fetcher = stubApi({
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
      '/api/ask': () => json(askAnswer()),
      '/api/notice': () => json(noticeResponse()),
    });
    const signal = new AbortController().signal;
    const household = sample('family-car-asthma');
    expect((await planCall({ household, location: DELHI, language: 'en' }, signal)).ok).toBe(true);
    expect((await askCall({ question: 'Q?', household, location: DELHI, language: 'en' }, signal)).ok).toBe(
      true,
    );
    expect((await noticeCall({ community: communityAt(0), location: DELHI }, signal)).ok).toBe(true);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/plan', '/api/ask', '/api/notice']);
  });
});
