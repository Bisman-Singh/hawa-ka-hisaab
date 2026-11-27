// The API the journeys talk to: the real app with its routes and guards, run in the test process with a fixed
// clock, CPCB stations and a forecast from the test fixtures, and a scripted model. No request leaves the machine.
import type { Page } from '@playwright/test';
import type { AirSources, StationFeed, StationRecord } from '../../src/features/air/types.js';
import type { ModelPort } from '../../src/lib/model.js';
import { ok } from '../../src/lib/result.js';
import { createApp } from '../../src/server/app.js';
import {
  createFakeAirProvider,
  createFakeForecastProvider,
  hourCurve,
  jnuStation,
  rkPuramStation,
} from '../../test/support/fake-air.js';
import { createFakeAirSources } from '../../test/support/fake-air-sources.js';
import { createFakeClock } from '../../test/support/fake-clock.js';
import { winterDay } from '../../test/support/plan-fixtures.js';
import { createTestDeps } from '../../test/support/test-deps.js';

/** The moment the journeys happen at, for the server and the page alike: 06:40 IST on 24 Nov 2026. */
export const NOW = '2026-11-24T06:40:00+05:30';

/** The hour of the station readings. */
export const READING_HOUR = '2026-11-24T06:00:00+05:30';

/** A PIN in the test table: Central Delhi, about 12 km from the JNU station. */
export const PIN = '110001';

/** The JNU station with made-up very poor values at the reading hour, so the day is a severe one. */
function veryPoorJnu(): StationRecord {
  return {
    ...jnuStation(),
    aqiValue: 342,
    pollutants: [
      { pollutant: 'pm25', hourlySubIndex: 351, avg: 342, min: 280, max: 371 },
      { pollutant: 'pm10', hourlySubIndex: 238, avg: 221, min: 180, max: 260 },
      { pollutant: 'no2', hourlySubIndex: 61, avg: 58, min: 40, max: 75 },
    ],
    readingHour: READING_HOUR,
  };
}

function airSources(): AirSources {
  const feed: StationFeed = {
    provider: 'cpcb_feed',
    feedHour: READING_HOUR,
    stations: [veryPoorJnu(), { ...rkPuramStation(), readingHour: READING_HOUR }],
  };
  return createFakeAirSources({
    stations: createFakeAirProvider([{ kind: 'fresh', feed }]),
    forecast: createFakeForecastProvider(ok(hourCurve(winterDay()))),
  });
}

/** What the page asked of the API, as method and path, and each answer with its path, both in order. */
export interface ApiLog {
  readonly calls: string[];
  readonly answers: { readonly path: string; readonly body: unknown }[];
}

/** Answers every /api request of the page from the real app, and fixes the page's clock to the same moment. */
export async function serveApi(page: Page, model: ModelPort): Promise<ApiLog> {
  const clock = createFakeClock(Date.parse(NOW));
  const app = createApp(createTestDeps({ clock, air: airSources(), model }).deps);
  const log: ApiLog = { calls: [], answers: [] };
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    log.calls.push(`${request.method()} ${url.pathname}`);
    const body = request.postData();
    const answer = await app.request(`${url.pathname}${url.search}`, {
      method: request.method(),
      headers: { 'content-type': request.headers()['content-type'] ?? 'text/plain' },
      ...(body === null ? {} : { body }),
    });
    const text = await answer.text();
    log.answers.push({ path: url.pathname, body: JSON.parse(text) });
    await route.fulfill({
      status: answer.status,
      headers: Object.fromEntries(answer.headers.entries()),
      body: text,
    });
  });
  return log;
}
