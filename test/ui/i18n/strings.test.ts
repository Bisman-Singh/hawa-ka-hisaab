// Tests for the shared strings: band words, the scale sentence and the words for failed requests.
import { describe, expect, it } from 'vitest';
import type { ApiCallFailure } from '../../../src/ui/api-client.js';
import { BAND_TEXT, failureText, scaleSentence, UI } from '../../../src/ui/i18n/strings.js';

describe('strings', () => {
  it('quotes the CPCB health statements and names each band', () => {
    expect(BAND_TEXT.good.statement).toBe('Minimal Impact');
    expect(BAND_TEXT.very_poor.name).toBe('Very Poor');
    expect(UI.skip).toBe('Skip to content');
  });

  it('builds the sentence a screen reader hears for the scale', () => {
    expect(scaleSentence(342, 'very_poor', '301 to 400')).toBe(
      'AQI 342 is in the fifth of six bands, Very Poor, 301 to 400.',
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
});
