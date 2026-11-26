// The central claim through the whole app: each model route, for every sample household or community at three
// bands and a model that answers in six ways, gives a valid labelled body whose every number is in its trace.
import { describe, expect, it } from 'vitest';
import { askResponseSchema } from '../../src/features/assistant/contract.js';
import { noticeResponseSchema } from '../../src/features/community/contract.js';
import { COMMUNITY_SAMPLES } from '../../src/features/community/samples.js';
import type { NoticeResponse } from '../../src/features/community/types.js';
import { SAMPLE_HOUSEHOLDS } from '../../src/features/household/samples.js';
import { planResponseSchema } from '../../src/features/planner/contract.js';
import { findFact } from '../../src/config/facts/index.js';
import type { Language, Trace } from '../../src/lib/types.js';
import { createApp } from '../../src/server/app.js';
import { createFakeClock } from '../support/fake-clock.js';
import { planTexts } from '../support/plan-fixtures.js';
import { AQI_AT, airAt, behavingModel, jsonPost, MORNING_MS, PLACES } from '../support/route-fixtures.js';
import { untraced } from '../support/number-reader.js';
import type { Behaviour, TestBand } from '../support/route-fixtures.js';
import { createTestDeps } from '../support/test-deps.js';

const BANDS: readonly TestBand[] = ['severe', 'moderate', 'satisfactory'];
const BEHAVIOURS: readonly Behaviour[] = [
  'good',
  'invents_number',
  'html',
  'unknown_ids',
  'quota',
  'timeout',
];

/** The path and reason each behaviour must end in, per route. A made-up activity id is no error for a question. */
const EXPECTED: Readonly<
  Record<Behaviour, Readonly<Record<'plan' | 'ask' | 'notice', readonly [string, string | null]>>>
> = {
  good: { plan: ['model', null], ask: ['model', null], notice: ['model', null] },
  invents_number: {
    plan: ['rules', 'number_check_failed'],
    ask: ['rules', 'number_check_failed'],
    notice: ['rules', 'number_check_failed'],
  },
  html: {
    plan: ['rules', 'invalid_reply'],
    ask: ['rules', 'invalid_reply'],
    notice: ['rules', 'invalid_reply'],
  },
  unknown_ids: { plan: ['rules', 'invalid_reply'], ask: ['model', null], notice: ['rules', 'invalid_reply'] },
  quota: { plan: ['rules', 'quota'], ask: ['rules', 'quota'], notice: ['rules', 'quota'] },
  timeout: { plan: ['rules', 'timeout'], ask: ['rules', 'timeout'], notice: ['rules', 'timeout'] },
};

function appAt(band: TestBand, behaviour: Behaviour) {
  const place = band === 'satisfactory' ? PLACES.mumbai : PLACES.delhi;
  const deps = createTestDeps({
    model: behavingModel(behaviour),
    clock: createFakeClock(MORNING_MS),
    air: airAt(place, AQI_AT[band]),
  }).deps;
  return { app: createApp(deps), place };
}

async function post(app: ReturnType<typeof createApp>, path: string, body: unknown): Promise<unknown> {
  const response = await app.request(path, jsonPost(body));
  expect(response.status).toBe(200);
  return response.json();
}

const label = (trace: Trace): [string, string | null] => [trace.producedBy, trace.fallbackReason];

function noticeTexts(body: NoticeResponse): string[] {
  const hi = body.notice.hi;
  return [
    body.notice.en.title,
    ...body.notice.en.lines,
    ...(hi ? [hi.title, ...hi.lines] : []),
    ...body.actions.flatMap((action) => [action.title, action.detail]),
    ...body.facts.flatMap((fact) => [fact.label, fact.working.formula]),
  ];
}

/** Every fact id a response cites, anywhere in its body. */
function citedIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(citedIds);
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value).flatMap(([key, inner]) => {
    if (key === 'factIds' && Array.isArray(inner)) {
      return inner.filter((id): id is string => typeof id === 'string');
    }
    return key === 'factId' && typeof inner === 'string' ? [inner] : citedIds(inner);
  });
}

describe.each(BEHAVIOURS)('with a model that answers: %s', (behaviour) => {
  it.each(BANDS)('POST /api/plan, every sample household on a %s day, in English and Hindi', async (band) => {
    const { app, place } = appAt(band, behaviour);
    for (const sample of SAMPLE_HOUSEHOLDS) {
      for (const language of ['en', 'hi'] satisfies Language[]) {
        const body = planResponseSchema.parse(
          await post(app, '/api/plan', { household: sample.household, location: place, language }),
        );
        expect({ id: sample.id, label: label(body.trace) }).toEqual({
          id: sample.id,
          label: [...EXPECTED[behaviour].plan],
        });
        expect(body.plan.language).toBe(body.trace.producedBy === 'model' ? language : 'en');
        expect(untraced(planTexts(body.plan), body.trace)).toEqual([]);
        expect(citedIds(body).filter((id) => findFact(id) === null)).toEqual([]);
      }
    }
  });

  it.each(BANDS)('POST /api/ask, every sample household on a %s day', async (band) => {
    const { app, place } = appAt(band, behaviour);
    for (const sample of SAMPLE_HOUSEHOLDS) {
      const question = 'Can the first activity still go ahead today, and what does the plan suggest?';
      const body = askResponseSchema.parse(
        await post(app, '/api/ask', {
          question,
          household: sample.household,
          location: place,
          language: 'en',
        }),
      );
      expect({ id: sample.id, label: label(body.trace) }).toEqual({
        id: sample.id,
        label: [...EXPECTED[behaviour].ask],
      });
      expect(body.kind).toBe('answer');
      expect(untraced([body.text], body.trace)).toEqual([]);
      expect(citedIds(body).filter((id) => findFact(id) === null)).toEqual([]);
    }
  });

  it.each(BANDS)('POST /api/notice, both sample communities on a %s day', async (band) => {
    const { app, place } = appAt(band, behaviour);
    for (const sample of COMMUNITY_SAMPLES) {
      const body = noticeResponseSchema.parse(
        await post(app, '/api/notice', { community: sample.input, location: place }),
      );
      expect({ id: sample.id, label: label(body.trace) }).toEqual({
        id: sample.id,
        label: [...EXPECTED[behaviour].notice],
      });
      expect(untraced(noticeTexts(body), body.trace)).toEqual([]);
      expect(citedIds(body).filter((id) => findFact(id) === null)).toEqual([]);
    }
  });
});

describe('the fixed replies to medical questions', () => {
  it.each(BANDS)(
    'state no number outside their trace and cite only facts that exist, on a %s day',
    async (band) => {
      const { app, place } = appAt(band, 'good');
      const household = SAMPLE_HOUSEHOLDS[0]?.household;
      for (const question of [
        'What dose of her inhaler should she take?',
        'He cannot breathe and his lips are blue',
      ]) {
        const body = askResponseSchema.parse(
          await post(app, '/api/ask', { question, household, location: place, language: 'en' }),
        );
        expect(body).toMatchObject({ kind: 'medical_reply', trace: { producedBy: 'fixed_reply' } });
        expect(untraced([body.text], body.trace)).toEqual([]);
        expect(body.factIds.length).toBeGreaterThan(0);
        expect(body.factIds.filter((id) => findFact(id) === null)).toEqual([]);
      }
    },
  );
});

describe('the number reader the claim uses', () => {
  it('catches a number or a time that is not in the trace, in any digits, and skips pollutant names', () => {
    const trace = {
      ...sampleTraceFor([7, 45, 433]),
      toolCalls: [{ name: 't', args: {}, result: { effects: ['3.2 kg less CO2'] }, failure: null }],
    };
    expect(untraced(['AQI 433 at 07:45, 3.2 kg of CO2, PM2.5 and N95'], trace)).toEqual([]);
    expect(untraced(['AQI ९९९ at 07:46', '18:00'], trace)).toEqual([
      '07:46 in "AQI ९९९ at 07:46"',
      '999 in "AQI ९९९ at 07:46"',
      '18:00 in "18:00"',
    ]);
  });
});

function sampleTraceFor(values: readonly number[]): Trace {
  return {
    producedBy: 'model',
    modelId: 'fake-model',
    fallbackReason: null,
    factsSent: values.map((value) => ({ id: 'f', label: 'f', value, unit: '' })),
    modelReply: null,
    toolCalls: [],
    numberCheck: { status: 'passed', attempts: 1, unmatched: [] },
  };
}
