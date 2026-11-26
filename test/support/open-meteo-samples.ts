// Open-Meteo answers shaped like the live ones of 26 Nov 2026, cut short: air quality for Delhi and a town search.

/** An air quality answer for Delhi with three hours, IST offset and the six pollutants the app asks for. */
export function sampleAirAnswer(): {
  utc_offset_seconds: number;
  hourly: Record<string, (string | number | null)[]>;
} {
  return {
    utc_offset_seconds: 19800,
    hourly: {
      time: ['2026-11-25T21:00', '2026-11-25T22:00', '2026-11-25T23:00'],
      pm2_5: [150.9, 156.0, 158.3],
      pm10: [153.7, 158.8, 161.1],
      nitrogen_dioxide: [87.3, 83.5, 79.7],
      sulphur_dioxide: [57.6, 56.3, 53.7],
      ozone: [8.0, 6.0, 5.0],
      carbon_monoxide: [2464.0, 2100.0, 1791.0],
    },
  };
}

/** A search result for Muzaffarpur, Bihar, as Open-Meteo gives it. */
export function sampleSearchResult(): Record<string, string | number> {
  return {
    id: 1262330,
    name: 'Muzaffarpur',
    latitude: 26.12259,
    longitude: 85.39055,
    feature_code: 'PPL',
    country_code: 'IN',
    admin1: 'Bihar',
    admin2: 'Muzaffarpur district',
    admin3: 'Musahri',
    population: 354462,
  };
}
