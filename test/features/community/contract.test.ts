// Tests for the notice route contract.
import { describe, expect, it } from 'vitest';
import {
  noticeRequestSchema,
  noticeResponseSchema,
  noticeRoute,
} from '../../../src/features/community/contract.js';
import { sampleCommunity, sampleTrace, sampleWorking } from '../../support/samples.js';

describe('noticeRoute', () => {
  it('is a POST at /api/notice', () => {
    expect(noticeRoute).toMatchObject({ method: 'POST', path: '/api/notice' });
  });

  it('takes the community and a location', () => {
    expect(
      noticeRequestSchema.safeParse({ community: sampleCommunity(), location: { lat: 19.07, lon: 72.88 } })
        .success,
    ).toBe(true);
  });

  it('answers with computed facts, actions, the notice and the trace', () => {
    const body = {
      facts: [{ label: 'Generator hours a week', value: 21, unit: 'hours', working: sampleWorking() }],
      actions: [],
      notice: { en: { title: 'Air today', lines: ['x'] }, hi: { title: 'आज की हवा', lines: ['य'] } },
      trace: sampleTrace(),
    };
    expect(noticeResponseSchema.safeParse(body).success).toBe(true);
  });
});
