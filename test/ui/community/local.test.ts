// Tests for notices made in this browser with the model off: the same facts, actions and fixed notice the notice
// route serves without the model, for the same air at the same moment.
import { describe, expect, it } from 'vitest';
import { airResponseSchema } from '../../../src/features/air/contract.js';
import { noticeResponseSchema } from '../../../src/features/community/contract.js';
import { COMMUNITY_SAMPLES } from '../../../src/features/community/samples.js';
import { createApp } from '../../../src/server/app.js';
import { localNotice } from '../../../src/ui/community/local.js';
import { LOCAL_TRACE } from '../../../src/ui/plan/local.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { AQI_AT, airAt, jsonPost, MORNING_MS, PLACES } from '../../support/route-fixtures.js';
import { createTestDeps } from '../../support/test-deps.js';

describe('localNotice', () => {
  it('makes the facts, actions and notice the route serves without the model', async () => {
    const clock = createFakeClock(MORNING_MS);
    const app = createApp(createTestDeps({ clock, air: airAt(PLACES.delhi, AQI_AT.severe) }).deps);
    const { lat, lon } = PLACES.delhi;
    const airAnswer = await app.request(`/api/air?lat=${String(lat)}&lon=${String(lon)}`);
    const air = airResponseSchema.parse(await airAnswer.json());
    for (const { input } of COMMUNITY_SAMPLES) {
      const answer = await app.request('/api/notice', jsonPost({ community: input, location: PLACES.delhi }));
      const served = noticeResponseSchema.parse(await answer.json());
      const made = noticeResponseSchema.parse(localNotice(input, air, MORNING_MS));
      expect(served.trace.producedBy).toBe('rules');
      expect({ ...made, trace: served.trace }).toEqual(served);
      expect(made.trace).toEqual(LOCAL_TRACE);
    }
  });
});
