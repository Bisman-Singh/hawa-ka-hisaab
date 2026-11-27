// Tests for plans made in this browser with the model off: the same plan, air basis and what-if context the plan
// route serves on its rules path for the same air and moment, in either language, and a trace that sends nothing.
import { describe, expect, it } from 'vitest';
import { airResponseSchema } from '../../../src/features/air/contract.js';
import { planResponseSchema } from '../../../src/features/planner/contract.js';
import type { Language } from '../../../src/lib/types.js';
import { createApp } from '../../../src/server/app.js';
import { LOCAL_TRACE, localPlan } from '../../../src/ui/plan/local.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { sample } from '../../support/plan-fixtures.js';
import { AQI_AT, airAt, jsonPost, MORNING_MS, PLACES } from '../../support/route-fixtures.js';
import { createTestDeps } from '../../support/test-deps.js';

async function served(household: ReturnType<typeof sample>, language: Language = 'en') {
  const clock = createFakeClock(MORNING_MS);
  const app = createApp(createTestDeps({ clock, air: airAt(PLACES.delhi, AQI_AT.severe) }).deps);
  const { lat, lon } = PLACES.delhi;
  const air = airResponseSchema.parse(
    await (await app.request(`/api/air?lat=${String(lat)}&lon=${String(lon)}`)).json(),
  );
  const body = { household, location: PLACES.delhi, language };
  const plan = planResponseSchema.parse(await (await app.request('/api/plan', jsonPost(body))).json());
  return { air, plan };
}

describe('localPlan', () => {
  it('makes exactly the plan the route serves without the model, from the same air and time', async () => {
    for (const id of ['family-car-asthma', 'older-couple-chulha', 'students-cycle']) {
      const household = sample(id);
      const { air, plan } = await served(household);
      expect(plan.trace.producedBy).toBe('rules');
      const made = localPlan({ household, language: 'en' }, air, MORNING_MS);
      expect(made.plan).toEqual(plan.plan);
      expect(made.airBasis).toEqual(plan.airBasis);
      expect(made.whatIfContext).toEqual(plan.whatIfContext);
    }
  });

  it('makes the Hindi plan the route serves when Hindi is chosen', async () => {
    const household = sample('family-car-asthma');
    const { air, plan } = await served(household, 'hi');
    const made = localPlan({ household, language: 'hi' }, air, MORNING_MS);
    expect(made.plan.language).toBe('hi');
    expect(made.plan).toEqual(plan.plan);
    expect(made.plan.headline).toMatch(/\p{Script=Devanagari}/u);
  });

  it('carries a trace that says fixed rules wrote it and nothing was sent', async () => {
    const household = sample('family-car-asthma');
    const { air } = await served(household);
    const made = planResponseSchema.parse(localPlan({ household, language: 'en' }, air, MORNING_MS));
    expect(made.trace).toEqual(LOCAL_TRACE);
    expect(LOCAL_TRACE).toMatchObject({
      producedBy: 'rules',
      factsSent: [],
      modelReply: null,
      toolCalls: [],
    });
  });
});
