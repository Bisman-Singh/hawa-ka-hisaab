// Tests for the Open-Meteo forecast request and the mapping of its answer to the hour curve.
import { describe, expect, it } from 'vitest';
import { forecastUrl, openMeteoAirSchema, toHourCurve } from '../../../src/features/air/forecast.js';
import { hourCurveSchema } from '../../../src/features/air/schemas.js';
import { sampleAirAnswer } from '../../support/open-meteo-samples.js';

const SAMPLE_ANSWER = sampleAirAnswer();

describe('forecastUrl', () => {
  it('asks the CAMS global model for the index pollutants, a past day and two days ahead, in IST', () => {
    const url = new URL(forecastUrl({ lat: 28.6, lon: 77.2 }));
    expect(url.origin + url.pathname).toBe('https://air-quality-api.open-meteo.com/v1/air-quality');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '28.6',
      longitude: '77.2',
      hourly: 'pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide',
      timezone: 'Asia/Kolkata',
      past_hours: '24',
      forecast_hours: '48',
      domains: 'cams_global',
    });
  });
});

describe('the answer', () => {
  it('maps to a curve labelled a model forecast, with the IST offset added to every hour', () => {
    const curve = toHourCurve(openMeteoAirSchema.parse(SAMPLE_ANSWER), Date.parse('2026-11-26T16:03:00Z'));
    expect(hourCurveSchema.safeParse(curve).success).toBe(true);
    expect(curve.kind).toBe('model_forecast');
    expect(curve.issuedAt).toBe('2026-11-26T21:33:00+05:30');
    expect(curve.hours[0]).toEqual({
      time: '2026-11-25T21:00:00+05:30',
      pm25: 150.9,
      pm10: 153.7,
      no2: 87.3,
      so2: 57.6,
      o3: 8,
      co: 2464,
    });
    expect(curve.source.publisher).toBe('Open-Meteo');
  });

  it('turns missing, short and negative series into null values', () => {
    const odd = { ...SAMPLE_ANSWER, hourly: { ...SAMPLE_ANSWER.hourly, pm2_5: [null, -1], ozone: [] } };
    const curve = toHourCurve(openMeteoAirSchema.parse(odd), 0);
    expect(curve.hours.map((hour) => hour.pm25)).toEqual([null, null, null]);
    expect(curve.hours.map((hour) => hour.o3)).toEqual([null, null, null]);
  });

  it('refuses an answer in another offset or with times it cannot read', () => {
    expect(openMeteoAirSchema.safeParse({ ...SAMPLE_ANSWER, utc_offset_seconds: 0 }).success).toBe(false);
    const badTime = { ...SAMPLE_ANSWER, hourly: { ...SAMPLE_ANSWER.hourly, time: ['25 Nov 21:00'] } };
    expect(openMeteoAirSchema.safeParse(badTime).success).toBe(false);
  });
});
