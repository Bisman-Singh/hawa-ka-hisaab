// Fixtures for the model routes: air at a chosen band in Delhi or Mumbai, and a model that answers in one of six
// ways built from the request it gets. Station values and the forecast are synthetic test data, not facts.
import { z } from 'zod';
import { householdSchema } from '../../src/features/household/schemas.js';
import { noticeReplySchema } from '../../src/features/community/schemas.js';
import type { AirSources, Location, StationFeed, StationRecord } from '../../src/features/air/types.js';
import type { AqiBand } from '../../src/features/naqi/types.js';
import { rulesChoice } from '../../src/features/planner/rules-plan.js';
import { candidateActionSchema } from '../../src/features/planner/schemas.js';
import type { JsonValue } from '../../src/lib/json.js';
import type { ModelPort, ModelRequest, ToolFailure } from '../../src/lib/model.js';
import { err, ok } from '../../src/lib/result.js';
import { languageSchema } from '../../src/lib/schemas/common.js';
import type { ToolCallRecord } from '../../src/lib/types.js';
import type { Clock } from '../../src/lib/clock.js';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { createGeminiModel } from '../../src/server/gemini.js';
import { createFakeAirSources } from './fake-air-sources.js';
import type { FakeClock } from './fake-clock.js';
import { scripted, textReply, type FetchMock } from './fake-gemini.js';
import { createFakeAirProvider, createFakeForecastProvider, hourCurve } from './fake-air.js';
import { winterDay } from './plan-fixtures.js';

/** 24 Nov 2026 06:00 IST: the day lies ahead, the reading is from 05:00. */
export const MORNING_MS = Date.parse('2026-11-24T06:00:00+05:30');

/** Two places: Delhi, in the NCR where GRAP applies, and Mumbai, where it does not. */
export const PLACES: Readonly<Record<'delhi' | 'mumbai', Location>> = {
  delhi: { lat: 28.63, lon: 77.22 },
  mumbai: { lat: 18.95, lon: 72.82 },
};

/** An AQI in each band the route tests use: severe, moderate and a mild satisfactory day. */
export const AQI_AT: Readonly<Record<'severe' | 'moderate' | 'satisfactory', number>> = {
  severe: 433,
  moderate: 157,
  satisfactory: 78,
};

function stationNear(place: Location, aqi: number): StationRecord {
  return {
    station: {
      name: 'Sector 62 Test Station',
      city: 'Test',
      state: 'Test',
      lat: place.lat + 0.01,
      lon: place.lon,
    },
    aqiValue: aqi,
    predominant: 'pm25',
    pollutants: [{ pollutant: 'pm25', hourlySubIndex: aqi, avg: aqi, min: aqi, max: aqi }],
    readingHour: '2026-11-24T05:00:00+05:30',
  };
}

/** Air sources with one fresh station reading at this AQI near the place and the synthetic winter forecast. */
export function airAt(place: Location, aqi: number): AirSources {
  const feed: StationFeed = {
    provider: 'cpcb_feed',
    feedHour: '2026-11-24T05:00:00+05:30',
    stations: [stationNear(place, aqi)],
  };
  return createFakeAirSources({
    stations: createFakeAirProvider([{ kind: 'fresh', feed }]),
    forecast: createFakeForecastProvider(ok(hourCurve(winterDay()))),
  });
}

/** How the fake model answers: well, with an invented number, with HTML, with unknown ids, over quota or late. */
export type Behaviour = 'good' | 'invents_number' | 'html' | 'unknown_ids' | 'quota' | 'timeout';

const planData = z.object({
  language: languageSchema,
  air: z.object({ aqi: z.number().nullable(), time: z.string().nullable() }),
  candidates: z.array(candidateActionSchema),
});
const noticeData = z.object({ wording: noticeReplySchema });
const askData = z.object({ language: languageSchema, context: z.object({ household: householdSchema }) });

const DEVANAGARI_DIGITS = (text: string): string =>
  text.replace(/\d/g, (digit) => String.fromCharCode(0x0966 + Number(digit)));

function planReply(data: string, behaviour: Behaviour): JsonValue {
  const { language, air, candidates } = planData.parse(JSON.parse(data));
  const hindi = language === 'hi';
  const aqi = air.aqi === null ? '' : String(air.aqi);
  const headline = hindi
    ? `आज सुबह का एक्यूआई ${DEVANAGARI_DIGITS(aqi)} है।`
    : `The AQI was ${aqi} at ${air.time ?? ''}.`;
  const madeUp = { candidateId: 'made-up-a9', title: 'Made up', why: 'Made up.', tradeOff: null };
  const items = rulesChoice(candidates).map((candidate) => ({
    candidateId: candidate.id,
    title: hindi ? `योजना: ${candidate.template.title}` : candidate.template.title,
    why: hindi ? `कारण: ${candidate.template.why}` : candidate.template.why,
    tradeOff: candidate.template.tradeOff,
  }));
  return {
    headline: spoil(headline, behaviour, hindi),
    items: behaviour === 'unknown_ids' ? [madeUp, ...items] : items,
  };
}

function noticeReply(data: string, behaviour: Behaviour): JsonValue {
  const { wording } = noticeData.parse(JSON.parse(data));
  const lines = (lang: 'en' | 'hi', prefix: string) =>
    wording[lang].actions.map((line, index) => ({
      id: behaviour === 'unknown_ids' && index === 0 ? 'made-up' : line.id,
      text: `${prefix} ${line.text}`,
    }));
  return {
    en: { title: spoil(wording.en.title, behaviour, false), actions: lines('en', 'Please note.') },
    hi: { title: wording.hi.title, actions: lines('hi', 'कृपया ध्यान दें।') },
  };
}

function spoil(text: string, behaviour: Behaviour, hindi: boolean): string {
  if (behaviour === 'invents_number') {
    return `${text} ${hindi ? 'यह ९९९ है।' : 'It is 999 today.'}`;
  }
  return behaviour === 'html' ? `${text} <b>now</b>` : text;
}

function callTool(
  request: ModelRequest<unknown>,
  name: string,
  args: Record<string, JsonValue>,
): ToolCallRecord {
  const tool = request.tools.find((candidate) => candidate.name === name);
  const outcome = tool ? tool.call(args) : err<ToolFailure>('unknown_tool');
  return outcome.ok
    ? { name, args, result: outcome.value, failure: null }
    : { name, args, result: null, failure: outcome.error };
}

const optionsResult = z.object({
  options: z.array(z.object({ title: z.string(), effects: z.array(z.string()) })),
});

function askReply(
  request: ModelRequest<unknown>,
  behaviour: Behaviour,
): { reply: JsonValue; calls: ToolCallRecord[] } {
  const { language, context } = askData.parse(JSON.parse(request.data));
  const activityId = behaviour === 'unknown_ids' ? 'a99' : (context.household.activities[0]?.id ?? 'a1');
  const call = callTool(request, 'activity_options', { activityId });
  const found = optionsResult.safeParse(call.result);
  const first = found.success ? found.data.options[0] : undefined;
  const plain = first
    ? `The plan suggests this: ${first.title}. ${first.effects.join('. ')}`.trim()
    : 'Nothing in the plan matches that.';
  const text = language === 'hi' ? `योजना के अनुसार: ${plain}` : plain;
  return { reply: { text: spoil(text, behaviour, language === 'hi') }, calls: [call] };
}

function replyFor(
  request: ModelRequest<unknown>,
  behaviour: Behaviour,
): { reply: JsonValue; calls: ToolCallRecord[] } {
  if (request.task === 'plan') {
    return { reply: planReply(request.data, behaviour), calls: [] };
  }
  if (request.task === 'notice') {
    return { reply: noticeReply(request.data, behaviour), calls: [] };
  }
  return askReply(request, behaviour);
}

/** A model that answers every request in one way, built from the request itself, and records what it was sent. */
export function behavingModel(
  behaviour: Behaviour,
): ModelPort & { readonly requests: ModelRequest<unknown>[] } {
  const requests: ModelRequest<unknown>[] = [];
  return {
    modelId: 'fake-model',
    requests,
    generate(request) {
      requests.push(request);
      if (behaviour === 'quota' || behaviour === 'timeout') {
        return Promise.resolve(err({ kind: behaviour }));
      }
      const { reply, calls } = replyFor(request, behaviour);
      const parsed = request.schema.safeParse(reply);
      const rawText = JSON.stringify(reply);
      return Promise.resolve(
        parsed.success
          ? ok({ value: parsed.data, rawText, modelId: 'fake-model', toolCalls: calls })
          : err({ kind: 'invalid_reply', reply: { rawText, modelId: 'fake-model' } }),
      );
    },
  };
}

/** Builds a JSON POST for the app with an optional client address. */
export function jsonPost(body: unknown, ip = '203.0.113.7'): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  };
}

/** The band names of AQI_AT. */
export type TestBand = keyof typeof AQI_AT & AqiBand;

/**
 * The real Gemini adapter over a scripted host that always answers with text that is not JSON, with a daily cap of
 * limit HTTP calls. It shows the cap counting every call, a retry included.
 */
export function cappedGemini(clock: Clock, limit: number): { model: ModelPort; fetch: FetchMock } {
  const host = scripted([() => textReply('not json')]);
  const callCap = createFixedWindowLimiter({ limit, windowMs: 86_400_000, maxKeys: 1, clock });
  const model = createGeminiModel({
    apiKey: 'test-key',
    models: ['gemini-test'],
    timeoutMs: 15_000,
    attemptMs: 9000,
    callCap,
    clock,
    fetch: host.fetch,
  });
  return { model, fetch: host.fetch };
}

/** An air source that takes slow.takesMs on the fake clock before the forecast answers, as a slow upstream would. */
export function slowAirAt(
  place: Location,
  aqi: number,
  slow: { readonly clock: FakeClock; readonly takesMs: number },
): AirSources {
  const sources = airAt(place, aqi);
  return {
    ...sources,
    forecast: {
      readHours: (location: Location) => {
        slow.clock.advance(slow.takesMs);
        return sources.forecast.readHours(location);
      },
    },
  };
}
