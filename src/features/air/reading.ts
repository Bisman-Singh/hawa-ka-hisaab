// Assembles the air card for a point: the station path when a usable station is within 50 km, else the
// modelled estimate with its reason, else unavailable; plus the feed state, the forecast curve and GRAP.
import { OPEN_METEO_AIR } from '../../config/facts/air/sources.js';
import type { HttpFailure } from '../../lib/http.js';
import type { Result } from '../../lib/result.js';
import { estimateNaqi } from '../naqi/estimate.js';
import { istHourStart, istIso } from './geo.js';
import { chooseStation, isStale, stationReading, type StationChoice } from './stations.js';
import type { AirReading, AirResponse, FeedStatus, GrapNotice, HourCurve, Location } from './types.js';
import { feedProblem } from './failures.js';
import type { ModelledReading, StationFeedRead } from './types.js';

/** Everything the air card is built from. now is epoch milliseconds when the response is made. */
export interface AirInput {
  readonly location: Location;
  readonly feed: StationFeedRead;
  readonly forecast: Result<HourCurve, HttpFailure>;
  readonly now: number;
  readonly grap: GrapNotice | null;
}

/** The feed state: whether this read fetched, the feed hour in use, whether it is stale, and why it failed. */
export function feedStatus(read: StationFeedRead, nowMs: number): FeedStatus {
  if (read.kind === 'miss') {
    return { fetch: 'failed', feedHour: null, stale: false, problem: feedProblem(read.failure) };
  }
  const feedHour = read.feed.feedHour;
  const stale = isStale(feedHour, nowMs);
  return read.kind === 'fresh'
    ? { fetch: 'ok', feedHour, stale }
    : { fetch: 'failed', feedHour, stale, problem: feedProblem(read.failure) };
}

// While the source is mid rebuild only its complete stations are known, so a place with none of them in range
// cannot be told apart from one with no station: it gets the feed reason, which offers a retry.
function modelledReason(read: StationFeedRead, choice: StationChoice): ModelledReading['reason'] {
  const updating = read.kind === 'last_good' && read.failure.kind === 'incomplete';
  if (read.kind === 'miss' || (updating && !choice.anyInRange)) {
    return 'feed_unavailable';
  }
  return choice.anyInRange ? 'no_station_reading' : 'no_station_in_range';
}

function readingFor(input: AirInput, choice: StationChoice, curve: HourCurve | null): AirReading {
  if (choice.pick) {
    return stationReading(choice.pick, input.now);
  }
  if (!curve) {
    const reason = input.feed.kind === 'miss' ? 'feed_and_model_down' : 'no_station_and_model_down';
    return { path: 'unavailable', reason };
  }
  const modelHour = istHourStart(input.now);
  return {
    path: 'modelled',
    reason: modelledReason(input.feed, choice),
    estimate: estimateNaqi(curve.hours, modelHour),
    modelHour: istIso(modelHour),
    nearestStationKm: choice.nearestKm,
    source: OPEN_METEO_AIR,
  };
}

/** Builds the body of GET /api/air. The forecast curve is null when the model did not answer. */
export function buildAirResponse(input: AirInput): AirResponse {
  const choice = chooseStation(
    input.location,
    input.feed.kind === 'miss' ? null : input.feed.feed,
    input.now,
  );
  const curve = input.forecast.ok ? input.forecast.value : null;
  return {
    reading: readingFor(input, choice, curve),
    feed: feedStatus(input.feed, input.now),
    forecast: curve,
    grap: input.grap,
  };
}
