// Response fixtures for the plan, ask and notice screens, made by the real planner and community code and checked
// with the route schemas. Only the ask answers and the Hindi wording stand in for model text.
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { airResponseSchema } from '../../../src/features/air/contract.js';
import type { AirResponse, HourCurve, StationReading } from '../../../src/features/air/types.js';
import { askResponseSchema } from '../../../src/features/assistant/contract.js';
import type { AskResponse } from '../../../src/features/assistant/types.js';
import { noticeResponseSchema } from '../../../src/features/community/contract.js';
import { buildCommunityReport } from '../../../src/features/community/report.js';
import { COMMUNITY_SAMPLES } from '../../../src/features/community/samples.js';
import type { CommunityInput, NoticeResponse } from '../../../src/features/community/types.js';
import { travelCo2 } from '../../../src/features/ledger/co2.js';
import type { AqiBand } from '../../../src/features/naqi/types.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { buildFactSet } from '../../../src/features/planner/fact-set.js';
import { planFromWording } from '../../../src/features/planner/from-wording.js';
import { planResponseSchema } from '../../../src/features/planner/contract.js';
import { rulesChoice, rulesPlan } from '../../../src/features/planner/rules-plan.js';
import type { PlanResponse } from '../../../src/features/planner/types.js';
import type { Travel } from '../../../src/features/household/types.js';
import type { FallbackReason, Trace } from '../../../src/lib/types.js';
import { saveState } from '../../../src/ui/storage.js';
import { hourCurve, jnuStation } from '../../support/fake-air.js';
import { planContext, sample, winterDay } from '../../support/plan-fixtures.js';

/** The synthetic winter forecast the fixtures use, issued at midnight IST on the fixture date. */
export const FORECAST: HourCurve = hourCurve(winterDay());

/** The hour of the fixture station reading. */
export const READING_HOUR = '2026-11-24T22:00:00+05:30';

/** A location in Delhi, rounded to two decimals as the air route needs. */
export const DELHI = { lat: 28.54, lon: 77.17 };

const CPCB_SOURCE = {
  title: 'CAAQMS hourly air quality index feed',
  publisher: 'Central Pollution Control Board',
  url: 'https://airquality.cpcb.gov.in/caaqms/rss_feed',
  published: null,
  retrieved: '2026-11-26',
};

/** The JNU station reading at the fixture hour with the given AQI and band. */
export function stationReading(band: AqiBand | null, value = 342): StationReading {
  const record = jnuStation();
  return {
    path: 'station',
    station: record.station,
    distanceKm: 2.1,
    aqi: band === null ? null : { value, band, predominant: 'pm25' },
    pollutants: record.pollutants,
    readingHour: READING_HOUR,
    stale: false,
    source: CPCB_SOURCE,
    provider: 'cpcb_feed',
  };
}

/** The air response for the fixture station, with the winter forecast unless another curve is given. */
export function airResponse(
  band: AqiBand | null = 'very_poor',
  forecast: HourCurve | null = FORECAST,
): AirResponse {
  return airResponseSchema.parse({
    reading: stationReading(band),
    feed: { fetch: 'ok', feedHour: READING_HOUR, stale: false },
    forecast,
    grap: null,
  });
}

/** The trace of the rules path, for the given reason the model was not used. */
export function rulesTrace(reason: FallbackReason | null = 'disabled'): Trace {
  return {
    producedBy: 'rules',
    modelId: null,
    fallbackReason: reason,
    factsSent: [],
    modelReply: null,
    toolCalls: [],
    numberCheck: { status: 'not_run', attempts: 0, unmatched: [] },
  };
}

/** Options for a plan fixture: the forecast the plan used, and the trace to attach. */
export interface PlanOptions {
  readonly curve?: HourCurve | null;
  readonly trace?: Trace;
}

/** A rules plan for a sample household on the given band, made by the real planner and checked by the schema. */
export function planResponse(id: string, band: AqiBand | null, options: PlanOptions = {}): PlanResponse {
  const curve = options.curve === undefined ? FORECAST : options.curve;
  const ctx = planContext(sample(id), band, curve);
  const set = buildCandidates(ctx);
  return planResponseSchema.parse({
    plan: rulesPlan(ctx, set),
    airBasis: { path: 'station', band, readingHour: READING_HOUR, forecastIssuedAt: curve?.issuedAt ?? null },
    trace: options.trace ?? rulesTrace(),
  });
}

/**
 * A plan the model worded in Hindi: the rules choice with Hindi titles and reasons standing in for the model's
 * reply, placed by the real planFromWording, and a trace with the real fact set and a passed number check.
 */
export function hindiPlanResponse(id: string, band: AqiBand): PlanResponse {
  const ctx = planContext(sample(id), band);
  const set = buildCandidates(ctx);
  const items = rulesChoice(set.actions).map((candidate) => ({
    candidateId: candidate.id,
    title: 'आज की योजना का कदम',
    why: 'पूर्वानुमान के अनुसार यह समय साफ़ है।',
    tradeOff: candidate.template.tradeOff === null ? null : 'यह मॉडल का पूर्वानुमान है।',
  }));
  const wording = { headline: 'आज हवा बहुत ख़राब है।', items };
  const plan = planFromWording(ctx, set, { wording, language: 'hi' });
  if (!plan.ok) {
    throw new Error('the Hindi wording names unknown candidates');
  }
  return planResponseSchema.parse({
    plan: plan.value,
    airBasis: { path: 'station', band, readingHour: READING_HOUR, forecastIssuedAt: FORECAST.issuedAt },
    trace: {
      producedBy: 'model',
      modelId: 'gemini-test',
      fallbackReason: null,
      factsSent: buildFactSet(ctx, set).slice(0, 20),
      modelReply: JSON.stringify(wording),
      toolCalls: [],
      numberCheck: { status: 'passed', attempts: 1, unmatched: [] },
    },
  });
}

const CAR: Travel = { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: 1, roundTrip: true };

/** A model answer that called the travel calculator, with the calculator's real result. */
export function askAnswer(): AskResponse {
  const result = travelCo2(CAR);
  return askResponseSchema.parse({
    kind: 'answer',
    text: 'Football at 15:00 is in cleaner air than at 18:00.\nThe forecast is a model.',
    language: 'en',
    band: 'very_poor',
    factIds: [],
    trace: {
      ...rulesTrace(null),
      producedBy: 'model',
      modelId: 'gemini-test',
      modelReply: '{"text":"Football at 15:00 is in cleaner air than at 18:00."}',
      toolCalls: [
        {
          name: 'travel_co2',
          args: { mode: 'car', km: 14 },
          result: { low: result?.low ?? 0, high: result?.high ?? 0 },
          failure: null,
        },
        { name: 'forecast_hours', args: { from: 18 }, result: null, failure: 'invalid_arguments' },
      ],
      numberCheck: { status: 'passed', attempts: 1, unmatched: [] },
    },
  });
}

/** The fixed reply for a medical question, with the advisory facts behind it. */
export function askMedical(): AskResponse {
  return askResponseSchema.parse({
    kind: 'medical_reply',
    text: 'This app does not answer questions about symptoms, medicines or diagnosis. Please see a doctor.\nRemain indoors and keep activity levels low.',
    language: 'en',
    band: 'very_poor',
    factIds: ['advice-very-poor-vulnerable', 'no-such-fact'],
    trace: { ...rulesTrace(null), producedBy: 'fixed_reply' },
  });
}

/** The reply when the model did not answer a question, on the rules path. */
export function askRules(): AskResponse {
  return askResponseSchema.parse({
    kind: 'answer',
    text: 'The model is not answering right now. The plan above still holds.',
    language: 'en',
    band: 'very_poor',
    factIds: [],
    trace: rulesTrace('quota'),
  });
}

/** The input of a sample community. A missing sample is a broken test and throws. */
export function communityAt(index: number): CommunityInput {
  const found = COMMUNITY_SAMPLES[index];
  if (!found) {
    throw new Error(`no community sample ${String(index)}`);
  }
  return found.input;
}

/** The notice response for a sample community on a very poor day, built by the real community report. */
export function noticeResponse(index = 0, withHindi = true): NoticeResponse {
  const community = communityAt(index);
  const report = buildCommunityReport({
    community,
    reading: stationReading('very_poor'),
    forecast: FORECAST,
    grap: null,
    now: Date.parse('2026-11-24T06:40:00+05:30'),
  });
  return noticeResponseSchema.parse({
    facts: report.facts,
    actions: report.actions,
    notice: { en: report.notice.en, hi: withHindi ? report.notice.hi : null },
    trace: withHindi ? rulesTrace(null) : rulesTrace('quota'),
  });
}

/** A JSON response as the API sends it. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** The API answers by route path; an unknown path is a test mistake and answers 404. */
export type Routes = Readonly<Record<string, (body: unknown) => Response | Promise<Response>>>;

/** The stubbed fetch, so tests can read the calls made. */
export type Fetcher = Mock<(url: string, init?: RequestInit) => Promise<Response>>;

/** The JSON body of a call the stubbed fetch received, or null when it had none. */
export function sentBody(fetcher: Fetcher, index: number): unknown {
  const body = fetcher.mock.calls.at(index)?.[1]?.body;
  return typeof body === 'string' ? JSON.parse(body) : null;
}

/** Stubs fetch with answers by route path and returns the mock so tests can read the calls. */
export function stubApi(routes: Routes): Fetcher {
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url, init) => {
    const path = url.split('?')[0] ?? '';
    const answer = routes[path];
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    return Promise.resolve(
      answer ? answer(body) : json({ error: { code: 'not_found', message: 'No.', issues: [] } }, 404),
    );
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

/** Saves a household and place in local storage, as the earlier views would. */
export function saveSample(id = 'family-car-asthma', language: 'en' | 'hi' = 'en'): void {
  saveState(window.localStorage, {
    version: 1,
    household: sample(id),
    location: DELHI,
    place: {
      id: 'p1',
      name: 'Delhi',
      district: null,
      state: 'Delhi',
      postcode: null,
      lat: 28.54,
      lon: 77.17,
    },
    language,
  });
}

/** Saves only a place, with no household yet. */
export function savePlaceOnly(): void {
  saveState(window.localStorage, {
    version: 1,
    household: null,
    location: DELHI,
    place: null,
    language: 'en',
  });
}

/** The value, or a thrown error naming what was missing: for test data that must exist. */
export function need<T>(value: T | null | undefined, what = 'a value'): T {
  if (value === null || value === undefined) {
    throw new Error(`missing ${what}`);
  }
  return value;
}

/** The text the live region last read out. */
export function announced(): string {
  return document.querySelector('.vh[role="status"] p')?.textContent ?? '';
}
