// Tests for the air summary read out when a reading arrives: AQI and band, the estimate, or why there is none.
import { describe, expect, it } from 'vitest';
import { airSummary } from '../../../src/ui/place/air-summary.js';
import { airResponse, jnuReading, modelledReading } from './air-fixtures.js';

describe('airSummary', () => {
  it('says the AQI and band, the estimate, or why there is none, in one sentence', () => {
    expect(airSummary(airResponse())).toBe('CPCB AQI 246, Poor.');
    expect(airSummary(airResponse({ reading: jnuReading({ aqi: null }) }))).toBe(
      'CPCB published no AQI for this station this hour.',
    );
    expect(airSummary(airResponse({ reading: jnuReading({ aqi: null, provider: 'data_gov_in' }) }))).toBe(
      'No AQI for this station this hour.',
    );
    const { provider, ...older } = jnuReading({ aqi: null });
    expect(provider).toBe('cpcb_feed');
    expect(airSummary(airResponse({ reading: older }))).toBe(
      'CPCB published no AQI for this station this hour.',
    );
    expect(airSummary(airResponse({ reading: modelledReading() }))).toBe(
      'Modelled estimate 61, Satisfactory.',
    );
    const thin = modelledReading({
      estimate: { status: 'insufficient', reason: 'too_few_pollutants', available: [] },
    });
    expect(airSummary(airResponse({ reading: thin }))).toBe(
      'The model gave too few pollutants for an index, so none is shown.',
    );
    expect(airSummary(airResponse({ reading: { path: 'unavailable', reason: 'feed_and_model_down' } }))).toBe(
      'The air reading could not be fetched.',
    );
  });
});
