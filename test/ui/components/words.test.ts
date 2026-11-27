// Tests for the shared strings: band words, the scale sentence and the words for failed requests.
import { describe, expect, it } from 'vitest';
import type { ApiCallFailure } from '../../../src/ui/api-client.js';
import { amountText, BAND_TEXT, failureText, scaleSentence, UI } from '../../../src/ui/components/words.js';

describe('strings', () => {
  it('quotes the CPCB health statements and names each band', () => {
    expect(BAND_TEXT.good.statement).toBe('Minimal Impact');
    expect(BAND_TEXT.very_poor.name).toBe('Very Poor');
    expect(UI.skip).toBe('Skip to content');
  });

  it('builds the sentence a screen reader hears for the scale, naming what the value is', () => {
    expect(scaleSentence({ label: 'CPCB AQI', value: 342, band: 'very_poor' }, '301 to 400')).toBe(
      'CPCB AQI 342 is in the fifth of six bands, Very Poor, 301 to 400.',
    );
    expect(scaleSentence({ label: 'Estimated index', value: 61, band: 'satisfactory' }, '51 to 100')).toBe(
      'Estimated index 61 is in the second of six bands, Satisfactory, 51 to 100.',
    );
  });

  it('words each failure, naming the wait on a rate limit', () => {
    expect(failureText({ kind: 'network' }).title).toBe('No connection');
    expect(failureText({ kind: 'http', status: 502 }).body).toBe('Try again in a moment.');
    const limited = (retryAfterSeconds: number | null): ApiCallFailure => ({
      kind: 'api',
      status: 429,
      code: 'rate_limited',
      retryAfterSeconds,
    });
    expect(failureText(limited(30)).body).toBe('Try again in 30 seconds.');
    expect(failureText(limited(null)).body).toBe('Try again in a minute.');
    expect(
      failureText({ kind: 'api', status: 503, code: 'upstream_unavailable', retryAfterSeconds: null }).title,
    ).toBe('A data source did not answer');
    expect(failureText({ kind: 'api', status: 500, code: 'internal', retryAfterSeconds: null }).title).toBe(
      'The server could not do this',
    );
  });

  it('writes a count of one in the singular and every other count as given', () => {
    expect([amountText(1, 'people'), amountText(1, 'outdoor periods'), amountText(1, 'km')]).toEqual([
      '1 person',
      '1 outdoor period',
      '1 km',
    ]);
    expect(amountText(3, 'people')).toBe('3 people');
  });
});
