// Fake air, forecast and geocoder ports, and builders for records shaped like the real feeds.
// The station values are copied from the saved CPCB fixture; the forecast hours are synthetic test data.
import type {
  AirProvider,
  ForecastProvider,
  Geocoder,
  HourCurve,
  HourlyAir,
} from '../../src/features/air/types.js';
import type { Location, Place, StationFeed, StationFeedRead } from '../../src/features/air/types.js';
import type { StationRecord } from '../../src/features/air/types.js';
import type { HttpFailure } from '../../src/lib/http.js';
import { err, ok, type Result } from '../../src/lib/result.js';
import type { Source } from '../../src/lib/types.js';

/** The JNU, Delhi station as the fixture publishes it: AQI 246 with PM2.5 predominant. */
export function jnuStation(): StationRecord {
  return {
    station: { name: 'JNU, Delhi - DPCC', city: 'Delhi', state: 'Delhi', lat: 28.540721, lon: 77.168544 },
    aqiValue: 246,
    predominant: 'pm25',
    pollutants: [
      { pollutant: 'pm25', hourlySubIndex: 293, avg: 246, min: 89, max: 321 },
      { pollutant: 'pm10', hourlySubIndex: 178, avg: 153, min: 96, max: 185 },
    ],
    readingHour: '2026-11-24T22:00:00+05:30',
  };
}

/** The R K Puram, Delhi station, for which the fixture has a blank AQI. */
export function rkPuramStation(): StationRecord {
  return {
    station: {
      name: 'R K Puram, Delhi - DPCC',
      city: 'Delhi',
      state: 'Delhi',
      lat: 28.563262,
      lon: 77.186937,
    },
    aqiValue: null,
    predominant: null,
    pollutants: [{ pollutant: 'pm25', hourlySubIndex: 327, avg: null, min: null, max: null }],
    readingHour: '2026-11-24T22:00:00+05:30',
  };
}

/** A feed snapshot holding the given stations at the fixture hour. */
export function stationFeed(
  stations: readonly StationRecord[] = [jnuStation(), rkPuramStation()],
): StationFeed {
  return { provider: 'cpcb_feed', feedHour: '2026-11-24T22:00:00+05:30', stations };
}

/** A fake station feed that returns the given reads in order, then repeats the last. */
export function createFakeAirProvider(
  reads: readonly StationFeedRead[],
): AirProvider & { calls: () => number } {
  let count = 0;
  return {
    calls: () => count,
    readStations: () => {
      count += 1;
      const read = reads[Math.min(count, reads.length) - 1] ?? { kind: 'miss', failure: { kind: 'network' } };
      return Promise.resolve(read);
    },
  };
}

/** A source record for synthetic forecast test data. */
export const TEST_FORECAST_SOURCE: Source = {
  title: 'Synthetic forecast for tests',
  publisher: 'Test fixture',
  url: 'https://example.org/test-forecast',
  published: null,
  retrieved: '2026-11-24',
};

/** Builds hourly rows from a start time with the given PM2.5 values and no other pollutants. */
export function hourlyRows(startIso: string, pm25: readonly number[]): HourlyAir[] {
  const start = Date.parse(startIso);
  return pm25.map((value, index) => ({
    time: new Date(start + index * 3_600_000).toISOString(),
    pm25: value,
    pm10: null,
    no2: null,
    so2: null,
    o3: null,
    co: null,
  }));
}

/** A synthetic forecast curve from the given PM2.5 values. */
export function hourCurve(pm25: readonly number[], startIso = '2026-11-24T00:00:00+05:30'): HourCurve {
  return {
    kind: 'model_forecast',
    issuedAt: startIso,
    hours: hourlyRows(startIso, pm25),
    source: TEST_FORECAST_SOURCE,
  };
}

/** A fake forecast port that answers every call with the same result and records the locations asked for. */
export function createFakeForecastProvider(
  result: Result<HourCurve, HttpFailure>,
): ForecastProvider & { locations: Location[] } {
  const locations: Location[] = [];
  return {
    locations,
    readHours: (location) => {
      locations.push(location);
      return Promise.resolve(result);
    },
  };
}

/** A fake geocoder over a fixed list. A query matches places whose name starts with it, ignoring case. */
export function createFakeGeocoder(places: readonly Place[], failure: HttpFailure | null = null): Geocoder {
  return {
    search: (query) => {
      if (failure) {
        return Promise.resolve(err(failure));
      }
      const wanted = query.trim().toLowerCase();
      return Promise.resolve(ok(places.filter((place) => place.name.toLowerCase().startsWith(wanted))));
    },
  };
}
