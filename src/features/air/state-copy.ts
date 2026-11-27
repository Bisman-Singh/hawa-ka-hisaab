// One state's copy of the data.gov.in stations: whether a new answer is taken over the copy before it, and how
// long it is used. The resource is rebuilt in place about once an hour, a new hour landing near half past.
import { err, ok, type Result } from '../../lib/result.js';
import { stationFeedOf } from './cpcb-feed.js';
import { SHORT_RETRY_MS } from './failures.js';
import type { DataGovStations } from './data-gov.js';
import type { FeedFailure, StationFeed } from './types.js';

const MINUTE = 60_000;

/**
 * How long a copy is used: an hour when whole and of a recent hour; ten minutes when whole but an hour or more
 * behind, as the next hour is due; twenty seconds when caught mid rebuild with stations or rows missing.
 */
export const COPY_TTL_MS: Readonly<Record<'whole' | 'behind' | 'partial', number>> = {
  whole: 60 * MINUTE,
  behind: 10 * MINUTE,
  partial: SHORT_RETRY_MS,
};

/** One state's copy. whole is false when the answer had stations or rows missing. */
export interface StateCopy {
  readonly feed: StationFeed;
  readonly whole: boolean;
  readonly ttlMs: number;
}

const ttlOf = (feed: StationFeed, whole: boolean, now: number): number => {
  if (!whole) {
    return COPY_TTL_MS.partial;
  }
  return now - Date.parse(feed.feedHour) < COPY_TTL_MS.whole ? COPY_TTL_MS.whole : COPY_TTL_MS.behind;
};

/**
 * Judges a state's answer. One is whole when no station lacks rows and at least half the stations the index lists
 * for the state, indexed, are there; now is when it came. Refused as incomplete: an answer with no complete station,
 * one older than the copy held, and one that is not whole while the copy held is, which stays in use meanwhile.
 */
export function judgeStateAnswer(
  answer: DataGovStations,
  earlier: StateCopy | undefined,
  context: { readonly indexed: number; readonly now: number },
): Result<StateCopy, FeedFailure> {
  const feed = stationFeedOf('data_gov_in', answer.complete);
  const whole = answer.incomplete === 0 && answer.complete.length >= context.indexed / 2;
  if (
    !feed.ok ||
    (earlier !== undefined && (feed.value.feedHour < earlier.feed.feedHour || (earlier.whole && !whole)))
  ) {
    return err({ kind: 'incomplete' });
  }
  return ok({ feed: feed.value, whole, ttlMs: ttlOf(feed.value, whole, context.now) });
}
