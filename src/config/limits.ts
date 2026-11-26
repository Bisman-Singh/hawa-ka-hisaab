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

/** Most distinct clients the in-memory rate limiter tracks before it evicts the oldest. */
export const RATE_MAX_CLIENTS = 10_000;
