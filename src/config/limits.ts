// Numeric limits and thresholds shared by the server, the client and the domain code.

/** Largest request body the API accepts, in bytes. */
export const MAX_BODY_BYTES = 64 * 1024;

/** Longest free-text household description the intake route accepts, in characters. */
export const MAX_INTAKE_TEXT_CHARS = 2000;

/** Longest follow-up question the ask route accepts, in characters. */
export const MAX_QUESTION_CHARS = 500;

/** A CPCB feed hour older than this many minutes is shown as stale. */
export const FEED_STALE_AFTER_MINUTES = 180;

/** With no station that has a reading within this distance, the modelled path is used. */
export const STATION_RADIUS_KM = 50;

/** Rough bounding box of India used to reject coordinates the app cannot serve. */
export const INDIA_BOUNDS: Readonly<Record<'minLat' | 'maxLat' | 'minLon' | 'maxLon', number>> = {
  minLat: 6,
  maxLat: 38,
  minLon: 68,
  maxLon: 98,
};

/** Most modelled hours a forecast curve may carry: one past day for estimates and up to seven days ahead. */
export const MAX_FORECAST_HOURS = 192;

/** Default time limit for one upstream call, in milliseconds. */
export const UPSTREAM_TIMEOUT_MS = 8000;

/** Length of the per-client rate limit window, in milliseconds. */
export const RATE_WINDOW_MS = 60_000;

/** Most distinct clients the in-memory rate limiter tracks before it evicts the oldest that is not blocked. */
export const RATE_MAX_CLIENTS = 10_000;

/**
 * Call budgets per upstream: calls one client may cause in a minute, and one instance in a minute and in a day. Open-Meteo's free tier allows 600 calls a minute and 10,000 a day from one address,
 * shared with whatever else runs behind the host's outgoing address. data.gov.in answers 429 after about a dozen
 * rapid calls. One air request makes at most one forecast call and two calls per state read.
 */
export const UPSTREAM_BUDGET: Readonly<
  Record<'openMeteo' | 'dataGovIn', Readonly<Record<'perClientPerMinute' | 'perMinute' | 'perDay', number>>>
> = {
  openMeteo: { perClientPerMinute: 20, perMinute: 120, perDay: 8000 },
  dataGovIn: { perClientPerMinute: 16, perMinute: 30, perDay: 20_000 },
};

/**
 * IST clock hours at which the morning, afternoon and evening slots of a plan begin. Hours before the morning
 * start count as evening, so a late night activity sits with the evening.
 */
export const SLOT_START_HOURS: Readonly<Record<'morning' | 'afternoon' | 'evening', number>> = {
  morning: 5,
  afternoon: 12,
  evening: 17,
};

/**
 * Time a model route may take from the request to its answer, air reads and model calls included. The host
 * stops a function at 30 seconds; this leaves room for the rest of the request.
 */
export const ROUTE_DEADLINE_MS = 20_000;

/** With less time than this left before the deadline, no model call is started and the rules path answers. */
export const MIN_MODEL_CALL_MS = 3000;

/** With less time than this left after a rejected reply, the one retry is skipped. */
export const MIN_RETRY_MS = 5000;

/** The call budget of one upstream. */
export type UpstreamLimits = (typeof UPSTREAM_BUDGET)['openMeteo'];
